import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import styles from "../styles/Home.module.css";

const Ideas: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Ideas | Maximilian Ast</title>
        <meta name="description" content="Ideas by Maximilian Ast" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Ideas</h1>
        <p>Working on something new.</p>
        <ul>
          <li>
            <Link href="/work">
              <a>Work</a>
            </Link>
          </li>
          <li>
            <Link href="/work">
              <a>Ideas</a>
            </Link>
          </li>
          <li>
            <a
              href="https://twitter.com/MaximilianAst"
              target="_blank"
              rel="noreferrer"
            >
              Twitter
            </a>
          </li>
        </ul>
      </main>
    </div>
  );
};

export default Ideas;
