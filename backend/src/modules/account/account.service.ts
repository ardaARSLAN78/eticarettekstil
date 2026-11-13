import { Prisma } from "../../generated/prisma/client.js";
import { id } from "../../core/sanitizer/index.js";
import { requireUser, type Context } from "../../graphql/context.js";
import { fail } from "../../lib/errors.js";
import { addressDto } from "./account.dto.js";

export async function saveAddress(context: Context, raw: unknown) {
  const user = requireUser(context);
  const { id: addressId, ...data } = addressDto.parse(raw);
  return context.db.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`);
    if (
      addressId &&
      !(await tx.customerAddress.findFirst({ where: { id: addressId, userId: user.id } }))
    )
      fail("Adres bulunamadı.", "NOT_FOUND");
    const count = await tx.customerAddress.count({ where: { userId: user.id } });
    if (!addressId && count >= 20) fail("En fazla 20 adres kaydedebilirsiniz.");
    if (count === 0) data.isDefault = true;
    if (data.isDefault)
      await tx.customerAddress.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    return addressId
      ? tx.customerAddress.update({ where: { id: addressId }, data })
      : tx.customerAddress.create({ data: { ...data, userId: user.id } });
  });
}

export async function deleteAddress(context: Context, raw: string) {
  const user = requireUser(context);
  const result = await context.db.customerAddress.deleteMany({
    where: { id: id.parse(raw), userId: user.id },
  });
  if (!result.count) fail("Adres bulunamadı.", "NOT_FOUND");
  return true;
}
