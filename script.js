// ==================== Configuration ====================
const baseUrl = "https://expense-tracking2.onrender.com";
const output = document.getElementById("output");
const authOutput = document.getElementById("auth-output");

// ==================== Auth State ====================
let authToken = localStorage.getItem("authToken");
let currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

// Check if user is logged in on page load
document.addEventListener("DOMContentLoaded", () => {
  if (authToken && currentUser) {
    showApp();
  } else {
    showAuth();
  }
});

// ==================== Auth Tab Navigation ====================
document.querySelectorAll('[data-auth-tab]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('[data-auth-tab]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
    const panelId = tab.dataset.authTab + '-panel';
    document.getElementById(panelId).classList.add('active');
  });
});

// ==================== App Tab Navigation ====================
document.querySelectorAll('[data-tab]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const panelId = tab.dataset.tab + '-panel';
    document.getElementById(panelId).classList.add('active');
  });
});

// ==================== Show/Hide Sections ====================
function showAuth() {
  document.getElementById("auth-section").style.display = "block";
  document.getElementById("app-section").style.display = "none";
}

function showApp() {
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("app-section").style.display = "block";
  if (currentUser) {
    document.getElementById("user-name").textContent = `Welcome, ${currentUser.name}`;
  }
}

// ==================== Output Helpers ====================
function showResult(data, outputEl = output) {
  if (typeof data === "string") {
    outputEl.innerHTML = formatOutput(data);
  } else {
    outputEl.innerHTML = formatOutput(JSON.stringify(data, null, 2));
  }
}

function formatOutput(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"([^"]+)":/g, '<span style="color: #a78bfa;">"$1"</span>:')
    .replace(/: "([^"]+)"/g, ': <span style="color: #34d399;">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span style="color: #fbbf24;">$1</span>')
    .replace(/: (true|false)/g, ': <span style="color: #60a5fa;">$1</span>')
    .replace(/: (null)/g, ': <span style="color: #94a3b8;">$1</span>');
}

function clearOutput() {
  output.innerHTML = '<span class="placeholder">Response will appear here...</span>';
}

function showError(message, outputEl = output) {
  outputEl.innerHTML = `<span style="color: #f87171;">❌ Error: ${message}</span>`;
}

function showSuccess(message, outputEl = output) {
  outputEl.innerHTML = `<span style="color: #34d399;">✅ ${message}</span>`;
}

function showLoading(outputEl = output) {
  outputEl.innerHTML = '<span style="color: #94a3b8;">Loading...</span>';
}

// ==================== API Helpers ====================
function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${authToken}`
  };
}

async function handleResponse(res) {
  const contentType = res.headers.get("content-type") || "";

  if (res.status === 204) {
    return { ok: res.ok, status: res.status, data: null };
  }

  if (res.status === 401 || res.status === 403) {
    // Token expired or invalid
    logout();
    return { ok: false, status: res.status, data: { message: "Session expired. Please login again." } };
  }

  if (contentType.includes("application/json")) {
    try {
      const json = await res.json();
      return { ok: res.ok, status: res.status, data: json };
    } catch (err) {
      return { ok: res.ok, status: res.status, data: { message: "Invalid JSON response" } };
    }
  }

  try {
    const text = await res.text();
    return { ok: res.ok, status: res.status, data: text };
  } catch (err) {
    return { ok: res.ok, status: res.status, data: { message: "Could not read response" } };
  }
}

function requireId(id, fieldName = "ID") {
  if (!id && id !== 0) {
    throw new Error(`${fieldName} is required`);
  }
}

// ==================== AUTH OPERATIONS ====================

// Register
async function register() {
  try {
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    if (!name || !email || !password) {
      showError("Name, Email and Password are required", authOutput);
      return;
    }

    showLoading(authOutput);
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const handled = await handleResponse(res);

    if (handled.ok) {
      showSuccess("Account created! Please login.", authOutput);
      // Clear inputs
      document.getElementById("registerName").value = "";
      document.getElementById("registerEmail").value = "";
      document.getElementById("registerPassword").value = "";
      // Switch to login tab
      document.querySelector('[data-auth-tab="login"]').click();
    } else {
      showResult(handled.data, authOutput);
    }
  } catch (err) {
    showError(err.message, authOutput);
  }
}

// Login
async function login() {
  try {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
      showError("Email and Password are required", authOutput);
      return;
    }

    showLoading(authOutput);
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const handled = await handleResponse(res);

    if (handled.ok && handled.data.token) {
      // Save token
      authToken = handled.data.token;
      localStorage.setItem("authToken", authToken);

      // Decode token to get user info (JWT payload is base64)
      const payload = JSON.parse(atob(authToken.split('.')[1]));
      currentUser = {
        id: parseInt(payload.sub),  // Convert to number
        name: payload.name,
        email: payload.email
      };
      localStorage.setItem("currentUser", JSON.stringify(currentUser));

      // Clear inputs
      document.getElementById("loginEmail").value = "";
      document.getElementById("loginPassword").value = "";

      // Show app
      showApp();
    } else {
      showError("Invalid email or password", authOutput);
    }
  } catch (err) {
    showError(err.message, authOutput);
  }
}

// Logout
function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem("authToken");
  localStorage.removeItem("currentUser");
  showAuth();
  if (authOutput) {
    authOutput.innerHTML = '<span class="placeholder">Status will appear here...</span>';
  }
}

// ==================== USER OPERATIONS ====================

// GET my account
async function getMyAccount() {
  try {
    showLoading();
    const res = await fetch(`${baseUrl}/users/${currentUser.id}`, {
      headers: getAuthHeaders()
    });
    const handled = await handleResponse(res);

    if (handled.ok) {
      showResult(handled.data);
    } else {
      showError(handled.data.message || "Failed to fetch account info");
    }
  } catch (err) {
    showError(err.message);
  }
}

// UPDATE my account
async function updateMyAccount() {
  try {
    const name = document.getElementById("updateUserName").value.trim();
    const email = document.getElementById("updateUserEmail").value.trim();

    const userData = {};
    if (name) userData.name = name;
    if (email) userData.email = email;

    if (Object.keys(userData).length === 0) {
      showError("Please fill at least one field to update (Name or Email)");
      return;
    }

    showLoading();
    const res = await fetch(`${baseUrl}/users/${currentUser.id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });

    const handled = await handleResponse(res);

    if (handled.ok) {
      // Update local user info
      if (name) currentUser.name = name;
      if (email) currentUser.email = email;
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      document.getElementById("user-name").textContent = `Welcome, ${currentUser.name}`;

      showResult({ message: "Account updated successfully!", user: handled.data });
      document.getElementById("updateUserName").value = "";
      document.getElementById("updateUserEmail").value = "";
    } else {
      showResult(handled.data);
    }
  } catch (err) {
    showError(err.message);
  }
}

// DELETE my account
async function deleteMyAccount() {
  try {
    if (!confirm("Are you sure you want to delete your account? This cannot be undone!")) {
      return;
    }

    showLoading();
    const res = await fetch(`${baseUrl}/users/${currentUser.id}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });

    const handled = await handleResponse(res);

    if (handled.ok || handled.status === 200) {
      alert("Account deleted successfully");
      logout();
    } else {
      showResult(handled.data);
    }
  } catch (err) {
    showError(err.message);
  }
}

// ==================== EXPENSE OPERATIONS ====================

// GET my expenses
async function getMyExpenses() {
  try {
    showLoading();
    const res = await fetch(`${baseUrl}/expenses`, {
      headers: getAuthHeaders()
    });
    const handled = await handleResponse(res);

    if (handled.ok) {
      if (Array.isArray(handled.data) && handled.data.length === 0) {
        showSuccess("No expenses found. Create your first expense!");
      } else {
        showResult(handled.data);
      }
    } else {
      showError(handled.data.message || "Failed to fetch expenses");
    }
  } catch (err) {
    showError(err.message);
  }
}

// GET expense by ID
async function getExpenseById() {
  try {
    const id = document.getElementById("expenseId").value.trim();
    requireId(id, "Expense ID");

    showLoading();
    const res = await fetch(`${baseUrl}/expenses/${encodeURIComponent(id)}`, {
      headers: getAuthHeaders()
    });
    const handled = await handleResponse(res);

    if (handled.ok) {
      showResult(handled.data);
    } else {
      showError(handled.data.message || "Expense not found");
    }
  } catch (err) {
    showError(err.message);
  }
}

// CREATE expense
async function createExpense() {
  try {
    const category = document.getElementById("category").value.trim();
    const subCategory = document.getElementById("subCategory").value.trim();
    const description = document.getElementById("description").value.trim();
    const amountRaw = document.getElementById("amount").value;
    const date = document.getElementById("date").value;

    if (!category || !subCategory || !amountRaw || !date) {
      showError("Category, Sub Category, Amount, and Date are required");
      return;
    }

    const amount = parseFloat(amountRaw);
    if (isNaN(amount) || amount <= 0) {
      showError("Amount must be a positive number");
      return;
    }

    const expenseData = {
      category,
      subCategory,
      description: description || "",
      amount,
      date
    };

    showLoading();
    const res = await fetch(`${baseUrl}/expenses`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(expenseData),
    });

    const handled = await handleResponse(res);

    if (handled.ok) {
      showResult({ message: "Expense created successfully!", expense: handled.data });
      document.getElementById("category").value = "";
      document.getElementById("subCategory").value = "";
      document.getElementById("description").value = "";
      document.getElementById("amount").value = "";
      document.getElementById("date").value = "";
    } else {
      showResult(handled.data);
    }
  } catch (err) {
    showError(err.message);
  }
}

// UPDATE expense
async function updateExpense() {
  try {
    const id = document.getElementById("updateExpenseId").value.trim();
    requireId(id, "Expense ID");

    const category = document.getElementById("updateCategory").value.trim();
    const subCategory = document.getElementById("updateSubCategory").value.trim();
    const description = document.getElementById("updateDescription").value.trim();
    const amount = document.getElementById("updateAmount").value;
    const date = document.getElementById("updateDate").value;

    const expenseData = {};
    if (category) expenseData.category = category;
    if (subCategory) expenseData.subCategory = subCategory;
    if (description) expenseData.description = description;
    if (amount) expenseData.amount = parseFloat(amount);
    if (date) expenseData.date = date;

    if (Object.keys(expenseData).length === 0) {
      showError("Please fill at least one field to update");
      return;
    }

    showLoading();
    const res = await fetch(`${baseUrl}/expenses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(expenseData),
    });

    const handled = await handleResponse(res);

    if (handled.ok) {
      showResult({ message: "Expense updated successfully!", expense: handled.data });
      document.getElementById("updateExpenseId").value = "";
      document.getElementById("updateCategory").value = "";
      document.getElementById("updateSubCategory").value = "";
      document.getElementById("updateDescription").value = "";
      document.getElementById("updateAmount").value = "";
      document.getElementById("updateDate").value = "";
    } else {
      showResult(handled.data);
    }
  } catch (err) {
    showError(err.message);
  }
}

// DELETE expense
async function deleteExpense() {
  try {
    const id = document.getElementById("deleteExpenseId").value.trim();
    requireId(id, "Expense ID");

    if (!confirm(`Are you sure you want to delete expense with ID ${id}?`)) {
      return;
    }

    showLoading();
    const res = await fetch(`${baseUrl}/expenses/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });

    const handled = await handleResponse(res);

    if (handled.ok || handled.status === 200) {
      showSuccess(`Expense with ID ${id} deleted successfully`);
      document.getElementById("deleteExpenseId").value = "";
    } else {
      showResult(handled.data);
    }
  } catch (err) {
    showError(err.message);
  }
}

