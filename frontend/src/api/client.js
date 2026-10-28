/**
 * SkillSync Frontend API Client
 *
 * Communicates with the Express/MongoDB backend using browser native fetch.
 * All requests include credentials: 'include' to handle HTTP-only authentication cookies.
 *
 * NOTE: The raw JWT is stored exclusively in an HTTP-only cookie and is never
 * accessible or handled directly by frontend JavaScript.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Core HTTP request handler with standardized JSON parsing and error handling.
 *
 * @param {string} endpoint e.g. '/auth/login'
 * @param {RequestInit} [options] Fetch configuration
 * @returns {Promise<any>} Parsed response data
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    credentials: 'include',
    headers: defaultHeaders,
  };

  try {
    const response = await fetch(url, config);

    // Parse JSON response body safely
    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    }

    // Handle non-2xx HTTP responses
    if (!response.ok) {
      const errorMessage =
        data?.error ||
        data?.message ||
        `Request failed with status ${response.status}`;

      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    // Graceful handling of network disconnection or offline backend
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const networkError = new Error(
        'Unable to connect to SkillSync authentication service. Please ensure the backend server is running.'
      );
      networkError.status = 0;
      networkError.isNetworkError = true;
      throw networkError;
    }

    throw err;
  }
}

/**
 * Register a new student account.
 *
 * @param {{ name: string, email: string, password: string }} credentials
 * @returns {Promise<{ user: { id: string, name: string, email: string, createdAt: string } }>}
 */
export async function registerUser({ name, email, password }) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

/**
 * Authenticate existing student credentials.
 *
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ user: { id: string, name: string, email: string, createdAt: string } }>}
 */
export async function loginUser({ email, password }) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Retrieve the currently authenticated user's profile using the session cookie.
 *
 * @returns {Promise<{ user: { id: string, name: string, email: string, createdAt: string } }>}
 */
export async function getCurrentUser() {
  return request('/auth/me', {
    method: 'GET',
  });
}

/**
 * Invalidate session and clear the authentication cookie on the backend.
 *
 * @returns {Promise<{ message: string }>}
 */
export async function logoutUser() {
  return request('/auth/logout', {
    method: 'POST',
  });
}

/**
 * Check backend service and database health.
 *
 * @returns {Promise<{ status: string, service: string, database: { status: string } }>}
 */
export async function checkHealth() {
  return request('/health', {
    method: 'GET',
  });
}

/**
 * Retrieve the currently authenticated student's profile and mode completeness.
 * Throws an error with status 404 if the user has not yet created a profile.
 *
 * @returns {Promise<{ profile: Object, completeness: Object }>}
 */
export async function getProfile() {
  return request('/profile/me', {
    method: 'GET',
  });
}

/**
 * Create or update the authenticated student's profile.
 * Strictly sends supported profile schema fields with HTTP-only session credentials.
 *
 * @param {Object} profileData
 * @returns {Promise<{ profile: Object, completeness: Object }>}
 */
export async function updateProfile(profileData) {
  return request('/profile/me', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
}

/**
 * Create a new student project.
 *
 * @param {Object} projectData
 * @returns {Promise<{ project: Object }>}
 */
export async function createProject(projectData) {
  return request('/projects', {
    method: 'POST',
    body: JSON.stringify(projectData),
  });
}

/**
 * Retrieve open projects with pagination.
 *
 * @param {{ page?: number, limit?: number }} [options]
 * @returns {Promise<{ projects: Array<Object>, pagination: { page: number, limit: number, totalProjects: number, totalPages: number, hasMore: boolean } }>}
 */
export async function getProjects({ page, limit } = {}) {
  const params = new URLSearchParams();
  if (page !== undefined && page !== null) params.append('page', String(page));
  if (limit !== undefined && limit !== null) params.append('limit', String(limit));
  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/projects${query}`, {
    method: 'GET',
  });
}

/**
 * Retrieve projects owned by the currently authenticated user with pagination.
 *
 * @param {{ page?: number, limit?: number }} [options]
 * @returns {Promise<{ projects: Array<Object>, pagination: { page: number, limit: number, totalProjects: number, totalPages: number, hasMore: boolean } }>}
 */
export async function getMyProjects({ page, limit } = {}) {
  const params = new URLSearchParams();
  if (page !== undefined && page !== null) params.append('page', String(page));
  if (limit !== undefined && limit !== null) params.append('limit', String(limit));
  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/projects/mine${query}`, {
    method: 'GET',
  });
}

/**
 * Retrieve single project details by MongoDB ObjectId.
 *
 * @param {string} projectId
 * @returns {Promise<{ project: Object }>}
 */
export async function getProject(projectId) {
  return request(`/projects/${projectId}`, {
    method: 'GET',
  });
}

/**
 * Update project fields (owner only).
 *
 * @param {string} projectId
 * @param {Object} projectData
 * @returns {Promise<{ project: Object }>}
 */
export async function updateProject(projectId, projectData) {
  return request(`/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(projectData),
  });
}

/**
 * Delete a project (owner only).
 *
 * @param {string} projectId
 * @returns {Promise<{ message: string }>}
 */
export async function deleteProject(projectId) {
  return request(`/projects/${projectId}`, {
    method: 'DELETE',
  });
}
