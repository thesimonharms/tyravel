export function parseQuotedViewList(expression: string): string[] {
  const names: string[] = [];
  const pattern = /['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(expression)) !== null) {
    names.push(match[1]!);
  }

  return names;
}

export function parseQuotedStrings(expression: string): string[] {
  return parseQuotedViewList(expression);
}