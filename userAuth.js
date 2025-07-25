// User Authentication System with Account Creation
// Users must create accounts before logging in

// Admin credentials (only you get admin access)
const ADMIN_CREDENTIALS = {
  email: 'guyattj39@gmail.com',
  password: 'Jg1091775',
  name: 'Admin User',
  isAdmin: true
};

// User session management
let userSession = null;

// Get stored users from localStorage
const getStoredUsers = () => {
  const users = localStorage.getItem('users');
  return users ? JSON.parse(users) : {};
};

// Save users to localStorage
const saveUsers = (users) => {
  localStorage.setItem('users', JSON.stringify(users));
};

export const userAuth = {
  // Check if user is logged in
  isLoggedIn: () => {
    return userSession !== null;
  },

  // Check if current user is admin
  isAdmin: () => {
    // Only allow the specific admin email
    if (!userSession) return false;
    
    // Check session flag
    if (userSession.isAdmin !== true) return false;
    
    // Only allow the specific admin email
    return userSession.email === 'guyattj39@gmail.com';
  },

  // Check if email already exists
  emailExists: (email) => {
    const users = getStoredUsers();
    return users.hasOwnProperty(email.toLowerCase());
  },

  // Create new account (no email verification required)
  signup: async (email, password, name, businessName, activeClients, websiteUrl) => {
    const users = getStoredUsers();
    const emailLower = email.toLowerCase();
    
    // Check if email already exists
    if (users.hasOwnProperty(emailLower)) {
      return { success: false, error: 'Email already exists' };
    }

    // Validate input
    if (!email || !password || !name || !businessName || !activeClients) {
      return { success: false, error: 'All required fields must be filled' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    try {
      // Create the account directly (no email verification needed)
      const newUser = {
        email: emailLower,
        password: password, // In production, this should be hashed
        name: name,
        businessName: businessName,
        activeClients: parseInt(activeClients) || 0,
        websiteUrl: websiteUrl || '',
        isAdmin: false,
        emailVerified: true, // Auto-verify
        createdAt: new Date().toISOString(),
        projects: []
      };
      
      users[emailLower] = newUser;
      saveUsers(users);
      
      // Dispatch custom event to notify admin dashboard
      window.dispatchEvent(new CustomEvent('userAdded', { detail: { user: newUser } }));
      
      return { 
        success: true, 
        message: 'Account created successfully!'
      };
    } catch (error) {
      console.error('Error during signup:', error);
      return { success: false, error: 'Failed to create account. Please try again.' };
    }
  },



  // Login user (only works for existing accounts)
  login: (email, password) => {
    const users = getStoredUsers();
    const emailLower = email.toLowerCase();

    // Check if it's admin login - only the specific admin email
    if (emailLower === 'guyattj39@gmail.com' && password === ADMIN_CREDENTIALS.password) {
      userSession = {
        email: emailLower,
        name: 'Admin User',
        isAdmin: true,
        loginTime: new Date().toISOString(),
        token: 'admin_token_' + Date.now()
      };
      localStorage.setItem('userSession', JSON.stringify(userSession));
      return { success: true, data: userSession };
    }

    // Check if user exists in active users
    if (users.hasOwnProperty(emailLower)) {
      const user = users[emailLower];

      // Check password
      if (user.password !== password) {
        return { success: false, error: 'Incorrect password' };
      }

      // Create session
      userSession = {
        email: user.email,
        name: user.name,
        isAdmin: false,
        loginTime: new Date().toISOString(),
        token: 'user_token_' + Date.now()
      };
      
      localStorage.setItem('userSession', JSON.stringify(userSession));
      
      return { success: true, data: userSession };
    }

    return { success: false, error: 'Account not found. Please sign up first.' };
  },

  // Logout user
  logout: () => {
    userSession = null;
    localStorage.removeItem('userSession');
    return { success: true };
  },

  // Clear all sessions (for debugging/admin use)
  clearAllSessions: () => {
    userSession = null;
    localStorage.removeItem('userSession');
    localStorage.removeItem('customerData');
    return { success: true };
  },

  // Get current user session
  getSession: () => {
    return userSession;
  },

  // Get user data
  getUserData: (email) => {
    const users = getStoredUsers();
    return users[email.toLowerCase()] || null;
  },

  // Update user data
  updateUserData: (email, updates) => {
    const users = getStoredUsers();
    const emailLower = email.toLowerCase();
    
    if (users.hasOwnProperty(emailLower)) {
      users[emailLower] = { ...users[emailLower], ...updates };
      saveUsers(users);
      return { success: true, data: users[emailLower] };
    }
    
    return { success: false, error: 'User not found' };
  },

  // Initialize session from localStorage
  initSession: () => {
    const storedSession = localStorage.getItem('userSession');
    if (storedSession) {
      try {
        userSession = JSON.parse(storedSession);
        
        // Validate session structure
        if (!userSession.email || !userSession.name) {
          console.warn('Invalid session structure, clearing session');
          localStorage.removeItem('userSession');
          userSession = null;
          return { success: false, error: 'Invalid session structure' };
        }
        
        // Ensure isAdmin is explicitly set for regular users
        if (userSession.isAdmin !== true) {
          userSession.isAdmin = false;
        }
        
        return { success: true, data: userSession };
      } catch (error) {
        console.error('Error parsing session:', error);
        localStorage.removeItem('userSession');
        userSession = null;
        return { success: false, error: 'Invalid session' };
      }
    }
    return { success: false, error: 'No session' };
  },

  // Validate admin access
  requireAdmin: () => {
    if (!userAuth.isLoggedIn() || !userAuth.isAdmin()) {
      throw new Error('Admin authentication required');
    }
    return true;
  },

  // Validate user access
  requireAuth: () => {
    if (!userAuth.isLoggedIn()) {
      throw new Error('User authentication required');
    }
    return true;
  },

  // Get all users (admin only)
  getAllUsers: () => {
    if (!userAuth.isAdmin()) {
      return { success: false, error: 'Admin access required' };
    }
    return { success: true, data: getStoredUsers() };
  }
};

export default userAuth; 