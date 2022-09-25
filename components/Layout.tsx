import Head from "next/head";
import Link from "next/link";
import { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="max-w-2xl mx-auto p-3 sm:p-6 ">
      <Head>
        <title>Maximilian Ast</title>
        <meta
          name="description"
          content="Maximilian Ast - Software | Startups | Investing"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <header className="flex items-center justify-between mb-8">
        <Link href="/">
          <a className="text-2xl sm:text-3xl font-display font-bold">
            Maximilian Ast
          </a>
        </Link>
        <nav>
          <ul className="flex items-center gap-5 sm:gap-10">
            <li>
              <Link href="/work">
                <a className="hover:underline font-display text-sm">Work</a>
              </Link>
            </li>
            <li>
              <Link href="/ideas">
                <a className="hover:underline font-display text-sm">Ideas</a>
              </Link>
            </li>
            <li>
              <a
                className="hover:underline font-display text-sm"
                href="https://twitter.com/MaximilianAst"
                target="_blank"
                rel="noreferrer"
              >
                Twitter
              </a>
            </li>
          </ul>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
