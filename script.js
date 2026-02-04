// ==================== Configuration ====================
const baseUrl = "https://expense-tracking2.onrender.com";
const output = document.getElementById("output");

// ==================== Tab Navigation ====================
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    // Remove active from all tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    // Add active to clicked tab
    tab.classList.add('active');

    // Hide all panels
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    // Show selected panel
    const panelId = tab.dataset.tab + '-panel';
    document.getElementById(panelId).classList.add('active');
  });
});

// ==================== Output Helpers ====================
function showResult(data) {
  // Format and display the result with syntax highlighting
  if (typeof data === "string") {
    output.innerHTML = formatOutput(data);
  } else {
    output.innerHTML = formatOutput(JSON.stringify(data, null, 2));
  }
}

function formatOutput(text) {
  // Simple syntax highlighting for JSON
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

function showError(message) {
  output.innerHTML = `<span style="color: #f87171;">❌ Error: ${message}</span>`;
}

function showSuccess(message) {
  output.innerHTML = `<span style="color: #34d399;">✅ ${message}</span>`;
}

// ==================== API Helpers ====================
async function handleResponse(res) {
  const contentType = res.headers.get("content-type") || "";

  if (res.status === 204) {
    return { ok: res.ok, status: res.status, data: null };
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

// ==================== USER OPERATIONS ====================

// GET all users
async function getAllUsers() {
  try {
    output.innerHTML = '<span style="color: #94a3b8;">Loading...</span>';
    const res = await fetch(`${baseUrl}/users`);
    const handled = await handleResponse(res);

    if (handled.ok) {
      const users = handled.data;
      if (users.length === 0) {
        showResult({ message: "No users found", users: [] });
      } else {
        showResult({ count: users.length, users: users });
      }
    } else {
      showResult(handled.data);
    }
  } catch (err) {
    showError(err.message);
  }
}

// GET user by ID
async function getUserById() {
  try {
    const id = document.getElementById("userId").value.trim();
    requireId(id, "User ID");

    output.innerHTML = '<span style="color: #94a3b8;">Loading...</span>';
    const res = await fetch(`${baseUrl}/users/${encodeURIComponent(id)}`);
    const handled = await handleResponse(res);
    showResult(handled.data);
  } catch (err) {
    showError(err.message);
  }
}

// CREATE user
async function createUser() {
  try {
    const name = document.getElementById("userName").value.trim();
    const email = document.getElementById("userEmail").value.trim();

    if (!name || !email) {
      showError("Name and Email are required");
      return;
    }

    output.innerHTML = '<span style="color: #94a3b8;">Creating user...</span>';
    const res = await fetch(`${baseUrl}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });

    const handled = await handleResponse(res);

    if (handled.ok) {
      showResult({ message: "User created successfully!", user: handled.data });
      // Clear inputs
      document.getElementById("userName").value = "";
      document.getElementById("userEmail").value = "";
    } else {
      showResult(handled.data);
    }
  } catch (err) {
    showError(err.message);
  }
}

// UPDATE user
async function updateUser() {
  try {
    const id = document.getElementById("updateUserId").value.trim();
    requireId(id, "User ID");

    const name = document.getElementById("updateUserName").value.trim();
    const email = document.getElementById("updateUserEmail").value.trim();

    const userData = {};
    if (name) userData.name = name;
    if (email) userData.email = email;

    if (Object.keys(userData).length === 0) {
      showError("Please fill at least one field to update (Name or Email)");
      return;
    }

    output.innerHTML = '<span style="color: #94a3b8;">Updating user...</span>';
    const res = await fetch(`${baseUrl}/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const handled = await handleResponse(res);

    if (handled.ok) {
      showResult({ message: "User updated successfully!", user: handled.data });
      // Clear inputs
      document.getElementById("updateUserId").value = "";
      document.getElementById("updateUserName").value = "";
      document.getElementById("updateUserEmail").value = "";
    } else {
      showResult(handled.data);
    }
  } catch (err) {
    showError(err.message);
  }
}

// DELETE user
async function deleteUser() {
  try {
    const id = document.getElementById("deleteUserId").value.trim();
    requireId(id, "User ID");

    if (!confirm(`Are you sure you want to delete user with ID ${id}?`)) {
      return;
    }

    output.innerHTML = '<span style="color: #94a3b8;">Deleting user...</span>';
    const res = await fetch(`${baseUrl}/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    const handled = await handleResponse(res);

    if (handled.ok) {
      showSuccess(`User with ID ${id} deleted successfully`);
      document.getElementById("deleteUserId").value = "";
    } else {
      showResult(handled.data);
    }
  } catch (err) {
    showError(err.message);
  }
}

// ==================== EXPENSE OPERATIONS ====================

// GET all expenses
async function getAllExpenses() {
  try {
    output.innerHTML = '<span style="color: #94a3b8;">Loading...</span>';
    const res = await fetch(`${baseUrl}/expenses`);
    const handled = await handleResponse(res);

    if (handled.ok) {
      const expenses = handled.data;
      if (expenses.length === 0) {
        showResult({ message: "No expenses found", expenses: [] });
      } else {
        showResult({ count: expenses.length, expenses: expenses });
      }
    } else {
      showResult(handled.data);
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

    output.innerHTML = '<span style="color: #94a3b8;">Loading...</span>';
    const res = await fetch(`${baseUrl}/expenses/${encodeURIComponent(id)}`);
    const handled = await handleResponse(res);
    showResult(handled.data);
  } catch (err) {
    showError(err.message);
  }
}

// GET expenses by user ID
async function getExpensesByUser() {
  try {
    const userId = document.getElementById("userExpensesId").value.trim();
    requireId(userId, "User ID");

    output.innerHTML = '<span style="color: #94a3b8;">Loading...</span>';
    const res = await fetch(`${baseUrl}/expenses/user/${encodeURIComponent(userId)}`);
    const handled = await handleResponse(res);

    if (handled.ok) {
      const expenses = handled.data;
      if (expenses.length === 0) {
        showResult({ message: `No expenses found for user ${userId}`, expenses: [] });
      } else {
        showResult({ userId: parseInt(userId), count: expenses.length, expenses: expenses });
      }
    } else {
      showResult(handled.data);
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
    const userId = document.getElementById("expenseUserId").value.trim();

    if (!category || !subCategory || !amountRaw || !date || !userId) {
      showError("Category, Sub Category, Amount, Date, and User ID are required");
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
      date,
      userId: parseInt(userId),
    };

    output.innerHTML = '<span style="color: #94a3b8;">Creating expense...</span>';
    const res = await fetch(`${baseUrl}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expenseData),
    });

    const handled = await handleResponse(res);

    if (handled.ok) {
      showResult({ message: "Expense created successfully!", expense: handled.data });
      // Clear inputs
      document.getElementById("category").value = "";
      document.getElementById("subCategory").value = "";
      document.getElementById("description").value = "";
      document.getElementById("amount").value = "";
      document.getElementById("date").value = "";
      document.getElementById("expenseUserId").value = "";
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

    output.innerHTML = '<span style="color: #94a3b8;">Updating expense...</span>';
    const res = await fetch(`${baseUrl}/expenses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expenseData),
    });

    const handled = await handleResponse(res);

    if (handled.ok) {
      showResult({ message: "Expense updated successfully!", expense: handled.data });
      // Clear inputs
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

    output.innerHTML = '<span style="color: #94a3b8;">Deleting expense...</span>';
    const res = await fetch(`${baseUrl}/expenses/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    const handled = await handleResponse(res);

    if (handled.ok) {
      showSuccess(`Expense with ID ${id} deleted successfully`);
      document.getElementById("deleteExpenseId").value = "";
    } else {
      showResult(handled.data);
    }
  } catch (err) {
    showError(err.message);
  }
}
