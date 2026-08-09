/**
 * Reading a CSV a foreign program wrote.
 *
 * Sixty lines rather than a dependency, and the reason is the same one that kept the output protocol
 * to a `cat()` (decision:56): the thing crossing the boundary is small, and a library would be
 * carrying a configuration surface — delimiters, encodings, type coercion, header inference — into a
 * place that wants exactly one behaviour. There is nothing here to configure.
 *
 * Deliberately **not** a dataframe reader. Every cell comes back as the string that was in the file.
 * cuecraft does not learn that a column is numeric, does not parse a date, and does not align on a
 * type it inferred; a table draws what R wrote, and what R wrote is already formatted, because R is
 * the half of this that knows what the numbers mean.
 *
 * RFC 4180 as far as it goes: comma separated, `"` quoted, `""` for a literal quote inside one,
 * newlines allowed inside quotes, CRLF or LF. A trailing newline is not an empty row. Anything
 * stranger than that is a file cuecraft refuses rather than guesses at — see `csvProblem`.
 */

export interface CsvTable {
  /** The first row. Every other row is checked against its length. */
  readonly columns: readonly string[];
  /** Every row after the header, each exactly as long as `columns`. */
  readonly rows: readonly (readonly string[])[];
}

/**
 * Split a CSV into rows of fields, or say why it cannot be one.
 *
 * A single pass with two states — inside a quoted field and outside one — because the alternative
 * is splitting on lines first and then discovering that a quoted field contained one.
 */
export function readCsv(text: string): { table?: CsvTable; problem?: string } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let started = false;

  const endField = (): void => {
    row.push(field);
    field = "";
    started = false;
  };
  const endRow = (): void => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char !== '"') {
        field += char;
        continue;
      }
      if (text[index + 1] === '"') {
        field += '"';
        index += 1;
        continue;
      }
      quoted = false;
      continue;
    }

    if (char === '"') {
      // A quote is only an opening quote at the start of a field. `a"b` is the literal three
      // characters, which is what every writer that does not quote at all produces.
      if (!started && field === "") {
        quoted = true;
        started = true;
        continue;
      }
      field += char;
      continue;
    }
    if (char === ",") {
      endField();
      continue;
    }
    if (char === "\n") {
      endRow();
      continue;
    }
    if (char === "\r") {
      if (text[index + 1] === "\n") index += 1;
      endRow();
      continue;
    }
    field += char;
    started = true;
  }

  if (quoted) {
    return { problem: "a quoted field is never closed" };
  }
  // A file ending in a newline has already had its last row pushed; anything else has a row in
  // progress. Distinguishing them is the whole reason `field`/`row` are not flushed unconditionally.
  if (field !== "" || row.length > 0) endRow();

  const [columns, ...body] = rows;
  if (columns === undefined) {
    return { problem: "the file is empty" };
  }
  if (body.length === 0) {
    return {
      problem: `the file has a header (${columns.join(", ")}) and no rows`,
    };
  }

  const blank = columns.findIndex((name) => name.trim() === "");
  if (blank >= 0) {
    return { problem: `column ${blank + 1} of the header has no name` };
  }
  const seen = new Set<string>();
  for (const name of columns) {
    if (seen.has(name)) {
      return { problem: `the header names ${JSON.stringify(name)} twice` };
    }
    seen.add(name);
  }

  const ragged = body.findIndex((entry) => entry.length !== columns.length);
  if (ragged >= 0) {
    return {
      problem:
        `row ${ragged + 1} has ${body[ragged]?.length} fields and the header has ` +
        `${columns.length}; every row must match the header`,
    };
  }

  return { table: { columns, rows: body } };
}
