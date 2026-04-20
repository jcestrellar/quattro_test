type FetchApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  queryParams?: Record<string, unknown>;
  body?: unknown;
  token?: string;
  headers?: HeadersInit;
};

export async function fetchApi<T = unknown>(
  url: string,
  options?: FetchApiOptions
): Promise<T> {
  const {
    method = 'GET',
    queryParams,
    body,
    token,
    headers = {},
  } = options ?? {};

  const queryString = queryParams
    ? new URLSearchParams(
        Object.entries(queryParams)
          .filter(([, value]) => value != null && value !== '')
          .map(([key, value]) => [key, String(value)])
      ).toString()
    : '';

  const fetchUrl = queryString ? `${url}?${queryString}` : url;

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body !== undefined) {
    requestOptions.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(fetchUrl, requestOptions);

    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status} ${res.statusText}`);
    }

    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching data');
  }
}
