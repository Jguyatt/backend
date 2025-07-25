// Purchase Handler - Automatically connects Stripe purchases to user accounts
// This handles the complete purchase flow from Stripe to dashboard

import { customerAuth } from './customerAuth';
import { userAuth } from './userAuth';

export const purchaseHandler = {
  // Handle successful purchase from Stripe
  handleSuccessfulPurchase: (purchaseData) => {
    console.log('💰 Processing successful purchase:', purchaseData);
    
    const {
      customerEmail,
      customerName,
      packageName,
      amount,
      stripeSessionId,
      stripeCustomerId
    } = purchaseData;

    // Get current user session to ensure we have the right user data
    const userSession = userAuth.getSession();
    const finalEmail = customerEmail || userSession?.email || 'customer@example.com';
    const finalName = customerName || userSession?.name || 'Customer';
    
    console.log('👤 Using user data:', { email: finalEmail, name: finalName });

    // Create customer data structure
    const customerData = {
      name: finalName,
      email: finalEmail,
      business: finalName + ' Business',
      package: packageName,
      monthlyRate: amount,
      activeProjects: [
        {
          id: Date.now(),
          name: `${packageName} Package`,
          status: 'Active',
          startDate: new Date().toISOString().split('T')[0],
          progress: 20, // Purchase completed, onboarding pending
          nextUpdate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          type: getProjectType(packageName),
          category: getProjectCategory(packageName),
          requirements: getProjectRequirements(packageName),
          estimatedDuration: getProjectDuration(packageName),
          deliverables: getProjectDeliverables(packageName)
        }
      ],
      orderTimeline: {
        orderPlaced: {
          status: 'completed',
          date: new Date().toISOString().split('T')[0],
          completed: true
        },
        onboardingForm: {
          status: 'pending',
          date: null,
          completed: false
        },
        orderInProgress: {
          status: 'pending',
          date: null,
          completed: false
        },
        reviewDelivery: {
          status: 'pending',
          date: null,
          completed: false
        },
        orderComplete: {
          status: 'pending',
          date: null,
          completed: false
        }
      },
      recentActivity: [
        { 
          type: 'purchase_completed', 
          message: `Purchase completed: ${packageName} Package`, 
          date: new Date().toISOString().split('T')[0] 
        }
      ],
      subscription: {
        status: 'Active',
        plan: `${packageName} Package`,
        monthlyRate: amount,
        nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      billing: {
        plan: `${packageName} Package`,
        amount: `$${amount}`,
        nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Active'
      },
      stripeCustomerId,
      stripeSessionId
    };

    // Store customer data
    customerAuth.loginAsCustomer(customerData);

    // Update user account if it exists
    updateUserAccount(finalEmail, packageName);

    // Create onboarding submission
    createOnboardingSubmission(finalEmail, finalName, packageName);

    // Dispatch events to notify components
    window.dispatchEvent(new CustomEvent('purchaseCompleted', { 
      detail: { customerData } 
    }));

    // Dispatch event for admin dashboard to refresh
    window.dispatchEvent(new CustomEvent('customerAdded', { 
      detail: { customerData } 
    }));

    console.log('✅ Purchase successfully processed for:', customerEmail);
    return customerData;
  },

  // Handle purchase from URL parameters (for Stripe success redirect)
  handlePurchaseFromURL: () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const success = urlParams.get('success');

    if (success === 'true' && sessionId) {
      console.log('🔄 Processing purchase from URL:', sessionId);
      
      // In a real app, you'd fetch the session details from your server
      // For now, we'll simulate the purchase data
      const userSession = userAuth.getSession();
      const purchaseData = {
        customerEmail: userSession?.email || 'customer@example.com',
        customerName: userSession?.name || 'Customer',
        packageName: getPackageFromSessionId(sessionId),
        amount: getAmountFromSessionId(sessionId),
        stripeSessionId: sessionId,
        stripeCustomerId: 'cus_' + Date.now()
      };

      return purchaseHandler.handleSuccessfulPurchase(purchaseData);
    }

    return null;
  },

  // Check for pending purchases on page load
  checkForPendingPurchases: () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const success = urlParams.get('success');

    if (success === 'true' && sessionId) {
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Process the purchase
      return purchaseHandler.handlePurchaseFromURL();
    }

    return null;
  }
};

// Helper functions
function getPackageFromSessionId(sessionId) {
  // Map session IDs to packages (in production, fetch from server)
  const sessionMappings = {
    'cs_test_': 'Map PowerBoost', // Map PowerBoost session
    'cs_live_': 'Map PowerBoost',
    'eVqdR9aNq5PagVU062dAk07': 'Test' // Test service session
  };

  for (const [prefix, packageName] of Object.entries(sessionMappings)) {
    if (sessionId.startsWith(prefix) || sessionId.includes(prefix)) {
      return packageName;
    }
  }

  return 'Map PowerBoost'; // Default
}

function getAmountFromSessionId(sessionId) {
  // Map Stripe session IDs to amounts based on the actual payment links
  const amountMappings = {
    '6oU3cvcVy5PaeNM7yudAk03': 249, // Map PowerBoost
    '3cIeVdf3G2CY9ts7yudAk04': 347, // Cloud Stack Boost
    'cNicN508MfpK498bOKdAk05': 299, // Local Citations
    '5kQdR92gU7XieNM8CydAk06': 849, // Platinum Local SEO
    'eVqdR9aNq5PagVU062dAk07': 1    // Test service
  };

  // Check if sessionId contains any of the payment link IDs
  for (const [linkId, amount] of Object.entries(amountMappings)) {
    if (sessionId.includes(linkId)) {
      return amount;
    }
  }

  // Fallback to default mapping for test/live sessions
  if (sessionId.startsWith('cs_test_') || sessionId.startsWith('cs_live_')) {
    return 249; // Default to Map PowerBoost amount
  }

  return 249; // Default fallback
}

function getProjectType(packageName) {
  const types = {
    'Map PowerBoost': 'Google Maps Optimization',
    'Cloud Stack Boost': 'Advanced Maps Integration',
    'Local Citations': 'Citation Building',
    'Platinum Local SEO': 'Comprehensive Local SEO',
    'Test': 'Local SEO Service'
  };
  return types[packageName] || 'Local SEO Service';
}

function getProjectCategory(packageName) {
  const categories = {
    'Map PowerBoost': 'Local SEO',
    'Cloud Stack Boost': 'Technical SEO',
    'Local Citations': 'Local SEO',
    'Platinum Local SEO': 'Premium Package',
    'Test': 'SEO'
  };
  return categories[packageName] || 'SEO';
}

function getProjectRequirements(packageName) {
  const requirements = {
    'Map PowerBoost': ['Business Information', 'Service Areas', 'Target Keywords'],
    'Cloud Stack Boost': ['Website Access', 'Business Details', 'Target Locations'],
    'Local Citations': ['Business Information', 'Service Categories', 'Local Areas'],
    'Platinum Local SEO': ['Complete Business Profile', 'Competitor Analysis', 'Local Strategy'],
    'Test': ['Business Information', 'Service Details', 'Target Keywords']
  };
  return requirements[packageName] || ['Business Information'];
}

function getProjectDuration(packageName) {
  const durations = {
    'Map PowerBoost': '30 days',
    'Cloud Stack Boost': '30 days',
    'Local Citations': '30 days',
    'Platinum Local SEO': '30 days',
    'Test': '30 days'
  };
  return durations[packageName] || '30 days';
}

function getProjectDeliverables(packageName) {
  const deliverables = {
    'Map PowerBoost': ['GMB Optimization', 'Map Rankings', 'Traffic Reports'],
    'Cloud Stack Boost': ['Cloud Stack Setup', 'Map Embeds', 'Performance Analytics'],
    'Local Citations': ['Citation Listings', 'NAP Consistency', 'Local Rankings'],
    'Platinum Local SEO': ['Full Local SEO Suite', 'Monthly Reports', 'Ongoing Optimization'],
    'Test': ['SEO Optimization', 'Rankings Report', 'Performance Analytics']
  };
  return deliverables[packageName] || ['SEO Optimization', 'Rankings Report'];
}

function updateUserAccount(email, packageName) {
  try {
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const user = users[email.toLowerCase()];
    
    if (user) {
      // Update user account to reflect the purchase
      user.activeClients = (user.activeClients || 0) + 1;
      user.projects = user.projects || [];
      user.projects.push({
        id: Date.now(),
        name: `${packageName} Package`,
        status: 'Active',
        startDate: new Date().toISOString().split('T')[0],
        progress: 20
      });
      
      users[email.toLowerCase()] = user;
      localStorage.setItem('users', JSON.stringify(users));
      
      // Dispatch event to notify admin dashboard
      window.dispatchEvent(new CustomEvent('userAdded', { 
        detail: { user } 
      }));
      
      console.log('👤 Updated user account for:', email);
    }
  } catch (error) {
    console.error('Error updating user account:', error);
  }
}

function createOnboardingSubmission(email, name, packageName) {
  try {
    const submissions = JSON.parse(localStorage.getItem('onboarding-submissions') || '[]');
    
    const submission = {
      id: 'submission_' + Date.now(),
      submittedAt: new Date().toISOString(),
      status: 'pending_approval',
      service: `${packageName} Package`,
      formData: {
        firstName: name.split(' ')[0] || 'Customer',
        lastName: name.split(' ').slice(1).join(' ') || 'Name',
        email: email,
        businessName: name || 'Customer Business',
        website: '',
        targetKeyword: '',
        supportingKeywords: '',
        googleBusinessProfile: '',
        address: '',
        phoneNumber: '',
        serviceAreas: '',
        businessDescription: ''
      }
    };
    
    submissions.push(submission);
    localStorage.setItem('onboarding-submissions', JSON.stringify(submissions));
    
    // Dispatch event to notify admin dashboard
    window.dispatchEvent(new CustomEvent('onboardingSubmitted', { 
      detail: { submission } 
    }));
    
    console.log('📝 Created onboarding submission for:', email);
  } catch (error) {
    console.error('Error creating onboarding submission:', error);
  }
}

export default purchaseHandler; 