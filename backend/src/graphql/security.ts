import { GraphQLError, Kind, type DocumentNode, type ValidationContext } from "graphql";

// Alias/fragment genişletmeleri hesaba katılır. Döngü, alan sayısı ve kök mutasyon sayısı sınırlandırılır.
export function resourceLimits(document: DocumentNode) {
  const fragments = new Map(
    document.definitions
      .filter((d) => d.kind === Kind.FRAGMENT_DEFINITION)
      .map((d) => [d.name.value, d]),
  );
  let fields = 0;
  let operations = 0;
  function walk(set: import("graphql").SelectionSetNode, depth: number, path: Set<string>) {
    if (depth > 8) throw new GraphQLError("Sorgu derinliği sınırı aşıldı.");
    for (const item of set.selections) {
      if (++fields > 220) throw new GraphQLError("Sorgu alan sayısı sınırı aşıldı.");
      if (item.kind === Kind.FIELD && item.selectionSet) walk(item.selectionSet, depth + 1, path);
      if (item.kind === Kind.INLINE_FRAGMENT) walk(item.selectionSet, depth, path);
      if (item.kind === Kind.FRAGMENT_SPREAD) {
        if (path.has(item.name.value)) throw new GraphQLError("Döngülü fragment kullanılamaz.");
        const fragment = fragments.get(item.name.value);
        if (fragment) walk(fragment.selectionSet, depth, new Set([...path, item.name.value]));
      }
    }
  }
  function rootCount(set: import("graphql").SelectionSetNode): number {
    return set.selections.reduce(
      (sum, item) =>
        sum +
        (item.kind === Kind.FIELD
          ? 1
          : item.kind === Kind.INLINE_FRAGMENT
            ? rootCount(item.selectionSet)
            : fragments.has(item.name.value)
              ? rootCount(fragments.get(item.name.value)!.selectionSet)
              : 0),
      0,
    );
  }
  for (const definition of document.definitions) {
    if (definition.kind !== Kind.OPERATION_DEFINITION) continue;
    operations++;
    walk(definition.selectionSet, 1, new Set());
    if (rootCount(definition.selectionSet) > (definition.operation === "mutation" ? 1 : 8))
      throw new GraphQLError("Bir istekte çok fazla kök işlem var.");
  }
  if (operations !== 1) throw new GraphQLError("Her istekte tek GraphQL işlemi gönderin.");
}

export function disableIntrospection(context: ValidationContext) {
  return {
    Field(node: import("graphql").FieldNode) {
      if (node.name.value === "__schema" || node.name.value === "__type")
        context.reportError(new GraphQLError("Şema sorgulama üretimde kapalıdır."));
    },
  };
}
