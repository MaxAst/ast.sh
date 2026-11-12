// Redirects the bare domain (ast.sh) to the canonical www.ast.sh, keeping path and query.
export default {
  fetch(request) {
    const url = new URL(request.url);
    url.protocol = "https:";
    url.hostname = "www.ast.sh";
    return Response.redirect(url.toString(), 308);
  },
};
