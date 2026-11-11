// The ways to engage. One source for the list on the page and for the
// self-check that compares what is rendered against it.

export interface Offer {
  name: string;
  /** The short note on the right of the row, exactly as it should appear. */
  note: string;
  body: string;
}

// TODO(max): no prices yet. These three offers are new; add a price to `note`
// (or a field of its own) once they are set.
export const offers: Offer[] = [
  {
    name: "A week on your system",
    note: "one week",
    body: "A week with your team and your codebase. You get a written answer to three questions: what to keep, what to rebuild, and what has to be true before you stop reading the code.",
  },
  {
    name: "New product",
    note: "from the first commit",
    body: "We set the product up together: the rules, the architecture, the stack and the checks. Then we build the first slice with agents writing the code, and you carry on without me.",
  },
  {
    name: "Rewrite",
    note: "one service, or all of it",
    body: "We rebuild what you have so that agents can own the code, checked against how the old system behaves. Rewrites are easier than you'd think.",
  },
];
