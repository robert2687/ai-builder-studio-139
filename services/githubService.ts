export const fetchRepoIndexHtml = async (repoUrl: string): Promise<string> => {
  const urlRegex = /https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/;
  const match = repoUrl.trim().match(urlRegex);

  if (!match) {
    throw new Error("Invalid GitHub repository URL. Please use the format: https://github.com/owner/repo");
  }

  const [, owner, repo] = match;

  const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/`;
  let contentsResponse;
  try {
      contentsResponse = await fetch(contentsUrl);
  } catch (e) {
      throw new Error("Network error. Could not connect to GitHub API.");
  }
  
  if (contentsResponse.status === 404) {
    throw new Error(`Repository not found at ${owner}/${repo}. Please check the URL.`);
  }
  if (contentsResponse.status === 403) {
    throw new Error(`GitHub API rate limit exceeded. Please wait and try again later.`);
  }
  if (!contentsResponse.ok) {
    throw new Error(`Could not fetch repository contents. Status: ${contentsResponse.statusText}`);
  }

  const contents: any[] = await contentsResponse.json();
  
  const indexHtmlFile = contents.find((file: any) => file.name === 'index.html' && file.type === 'file');

  if (!indexHtmlFile || !indexHtmlFile.download_url) {
    throw new Error("'index.html' not found in the root of the repository.");
  }

  const downloadUrl = indexHtmlFile.download_url;
  let fileResponse;
  try {
      fileResponse = await fetch(downloadUrl);
  } catch(e) {
      throw new Error("Network error. Could not download index.html.");
  }

  if (!fileResponse.ok) {
    throw new Error(`Could not download index.html. Status: ${fileResponse.statusText}`);
  }
  
  return await fileResponse.text();
};