import type { NextPage } from "next";
import Layout from "../components/Layout";

const Home: NextPage = () => {
  return (
    <Layout>
      <p>
        Working on{" "}
        <a href="https://www.tryloopa.com" className="underline text-[#99a1ed]">
          Loopa
        </a>
        . Freelancing as a developer until I can work on Loopa full-time.
      </p>
    </Layout>
  );
};

export default Home;
