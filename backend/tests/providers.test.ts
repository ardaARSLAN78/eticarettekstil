import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { iyzicoAdapter, iyzicoRequest } from "../src/modules/payments/providers/iyzico.js";
import { paytrAdapter } from "../src/modules/payments/providers/paytr.js";
import { bankTransferAdapter } from "../src/modules/payments/providers/bank-transfer.js";
import { stripeLineItems } from "../src/modules/payments/providers/stripe.js";
import { defaultSettings } from "../src/modules/settings/settings.dto.js";
import type { PaymentStart } from "../src/modules/payments/payments.types.js";

afterEach(() => vi.unstubAllGlobals());

// Bu testler sağlayıcılara ağ isteği göndermez; protokolün üretilen istek ve imzasını inceler.
function paymentInput(): PaymentStart {
  return {
    order: {
      id: "order001",
      customerName: "Ali Yılmaz",
      email: "ali@quantia.test",
      address: "Örnek adres numara 12",
      phone: "05321112233",
      city: "İstanbul",
      district: "Kadıköy",
      postalCode: "34710",
      total: 159990,
      shipping: 9990,
      items: [{ sku: "Q-001", name: "Polo", unitPrice: 75000, quantity: 2 }],
    } as PaymentStart["order"],
    settings: defaultSettings,
    sandbox: true,
    secrets: {
      apiKey: "sandbox-test",
      secretKey: "secret-test",
      merchantId: "123",
      merchantKey: "key-test",
      merchantSalt: "salt-test",
    },
    ip: "203.0.113.10",
    receiptToken: "a".repeat(64),
    identityNumber: "10000000146",
  };
}

describe("iyzico CheckoutForm protokolü", () => {
  it("isteği IYZWSv2 HMAC ile imzalar ve sandbox uç noktasını kullanır", async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "success" })));
    vi.stubGlobal("fetch", mock);
    const secrets = { apiKey: "sandbox-key", secretKey: "secret-only-test" };
    await iyzicoRequest("/test/path", { conversationId: "123" }, secrets, true);
    const [url, init] = mock.mock.calls[0]! as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(url).toBe("https://sandbox-api.iyzipay.com/test/path");
    const decoded = Buffer.from(headers.Authorization!.slice(8), "base64").toString("utf8");
    const expected = createHmac("sha256", secrets.secretKey)
      .update(headers["x-iyzi-rnd"]! + "/test/path" + init.body)
      .digest("hex");
    expect(decoded).toBe(
      `apiKey:${secrets.apiKey}&randomKey:${headers["x-iyzi-rnd"]}&signature:${expected}`,
    );
  });

  it("sipariş ve kargoyu kuruştan sağlayıcı tutarına doğru dönüştürür", async () => {
    const mock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          paymentPageUrl: "https://sandbox-cpp.iyzipay.com/checkout",
          token: "valid-checkout-token",
        }),
      ),
    );
    vi.stubGlobal("fetch", mock);
    const result = await iyzicoAdapter.start(paymentInput());
    expect(result.token).toBe("valid-checkout-token");
    const body = JSON.parse(mock.mock.calls[0]![1].body);
    expect(body.price).toBe("1599.90");
    expect(
      body.basketItems.reduce(
        (sum: number, item: { price: string }) => sum + Math.round(Number(item.price) * 100),
        0,
      ),
    ).toBe(159990);
    expect(body.buyer.identityNumber).toBe("10000000146");
  });

  it("kimlik alanına uydurma değer koymak yerine eksik bilgiyi reddeder", async () => {
    const input = paymentInput();
    delete input.identityNumber;
    await expect(iyzicoAdapter.start(input)).rejects.toThrow("kimlik numarası");
  });

  it("yanıtta sağlayıcı dışı bir yönlendirme adresini reddeder", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "success",
            paymentPageUrl: "https://attacker.example/checkout",
            token: "valid-token",
          }),
        ),
      ),
    );
    await expect(iyzicoAdapter.start(paymentInput())).rejects.toThrow("adres");
  });
});

describe("PayTR iFrame protokolü", () => {
  it("kuruş tutarı, sepet içeriği ve test ortamıyla HMAC üretir", async () => {
    const mock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ status: "success", token: "paytr-test-token" })),
      );
    vi.stubGlobal("fetch", mock);
    const input = paymentInput();
    const result = await paytrAdapter.start(input);
    expect(result.url).toBe("https://www.paytr.com/odeme/guvenli/paytr-test-token");
    const fields = mock.mock.calls[0]![1].body as URLSearchParams;
    expect(fields.get("payment_amount")).toBe("159990");
    expect(fields.get("test_mode")).toBe("1");
    const signed =
      [
        "merchant_id",
        "user_ip",
        "merchant_oid",
        "email",
        "payment_amount",
        "user_basket",
        "no_installment",
        "max_installment",
        "currency",
        "test_mode",
      ]
        .map((key) => fields.get(key))
        .join("") + input.secrets.merchantSalt;
    expect(fields.get("paytr_token")).toBe(
      createHmac("sha256", input.secrets.merchantKey!).update(signed).digest("base64"),
    );
    const basket = JSON.parse(Buffer.from(fields.get("user_basket")!, "base64").toString());
    expect(basket).toEqual([
      ["Polo", "750.00", 2],
      ["Kargo", "99.90", 1],
    ]);
    expect(fields.get("merchant_key")).toBeNull();
    expect(fields.get("merchant_salt")).toBeNull();
  });

  it("sağlayıcı HTTP hatasında güvenli ve anlaşılır hata verir", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("provider secret diagnostic", { status: 500 })),
    );
    await expect(paytrAdapter.start(paymentInput())).rejects.toThrow("Ödeme kuruluşuna");
  });
});

describe("Havale ayarları", () => {
  it("hesap adı ve IBAN eksikse yöntemi başlatmaz", async () => {
    await expect(bankTransferAdapter.start(paymentInput())).rejects.toThrow("IBAN");
  });
});

describe("Sağlayıcılarda indirim sonrası tahsilat tutarı", () => {
  function discountedInput() {
    const input = paymentInput();
    input.order.items[0]!.discountAmount = 15001;
    input.order.total = 144989;
    return input;
  }

  it("Stripe satır toplamı indirimli sipariş toplamıyla kuruşu kuruşuna eşleşir", () => {
    const input = discountedInput();
    const total = stripeLineItems(input.order).reduce(
      (sum, line) => sum + Number(line.price_data!.unit_amount) * Number(line.quantity),
      0,
    );
    expect(total).toBe(input.order.total);
  });

  it("PayTR sepeti bölünemeyen indirim kuruşunu kaybetmez", async () => {
    const mock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ status: "success", token: "test-token" })));
    vi.stubGlobal("fetch", mock);
    const input = discountedInput();
    await paytrAdapter.start(input);
    const fields = mock.mock.calls[0]![1].body as URLSearchParams;
    const basket = JSON.parse(Buffer.from(fields.get("user_basket")!, "base64").toString()) as [
      string,
      string,
      number,
    ][];
    const total = basket.reduce(
      (sum, item) => sum + Math.round(Number(item[1]) * 100) * item[2],
      0,
    );
    expect(total).toBe(input.order.total);
  });

  it("iyzico sepeti indirimli tutarı ve kargoyu aynı toplamda gönderir", async () => {
    const mock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          paymentPageUrl: "https://sandbox-cpp.iyzipay.com/checkout",
          token: "test-token",
        }),
      ),
    );
    vi.stubGlobal("fetch", mock);
    const input = discountedInput();
    await iyzicoAdapter.start(input);
    const body = JSON.parse(mock.mock.calls[0]![1].body);
    const total = body.basketItems.reduce(
      (sum: number, item: { price: string }) => sum + Math.round(Number(item.price) * 100),
      0,
    );
    expect(total).toBe(input.order.total);
    expect(Math.round(Number(body.paidPrice) * 100)).toBe(input.order.total);
  });
});
