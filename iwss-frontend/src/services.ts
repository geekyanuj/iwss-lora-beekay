// API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001/api/`;

export const URL = API_URL;
// console.log({ api: URL });
async function get(
  path: string,
  query:
    | string
    | string[][]
    | Record<string, string>
    | URLSearchParams
    | undefined
) {
  try {
    const data = await fetch(URL + path + "?" + new URLSearchParams(query), {
      method: "GET",
    })
      .then((response) => response.json())
      .then((data) => data);
    return data;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

async function post(path: string, body: unknown) {
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  try {
    const data = await fetch(URL + path, {
      method: "POST",
      body: JSON.stringify(body),
      headers: myHeaders,
    })
      .then((response) => response.json())
      .then((data) => data);
    return data;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

async function del(path: string) {
  try {
    const data = await fetch(URL + path, {
      method: "DELETE",
    })
      .then((response) => response.json())
      .then((data) => data);
    return data;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

export { get, post, del };
