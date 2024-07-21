import van from "vanjs-core";
import { Link, navigate } from "vanjs-routing";

const { main, h1, p, ol, li, button, br, div } = van.tags;

const Start = () =>
  main(
    h1("Bibliograph 2"),
    p(
      "BiblioGraph allows you turn a corpus of OpenAlex records into a scientometric landscape, composed by:",
    ),
    ol(
      li(
        "A base map consisting in the network of references that appear together in the records of the corpus;",
      ),
      li(
        "A layer of metadata extracted from the records (authors, sources, subﬁelds...) and positioned according to their co-occurrence with the references of the base map.",
      ),
    ),
    p(
      "(1) Deﬁne your corpus,   (2) set the ﬁlter thresholds and   (3) explore your bibliographic landscape.",
    ),
    button({ onclick: () => navigate("/search") }, "Start here =>"),
    Link({ href: "/" }, "Read the method paper"),
    div(
      "A project by",
      br(),
      "Nils Bonﬁls",
      br(),
      "Tommaso Venturini",
      br(),
      "Fork on Github",
      br(),
    ),
  );

export default Start;
