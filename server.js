const express = require('express');
const cors = require('cors');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_your_test_key_here');

const app = express();
const PORT = process.env.PORT || 3001;



// Middleware
app.use(cors());
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

// Stripe webhook endpoint
app.post('/api/webhooks/stripe', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('🔔 Received Stripe webhook event:', event.type);

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('💰 Payment completed for session:', session.id);
      
      // Process the purchase
      processPurchase(session);
      break;
      
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('💳 Payment intent succeeded:', paymentIntent.id);
      break;
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// Process purchase function
function processPurchase(session) {
  try {
    // Extract customer information
    const customerEmail = session.customer_details?.email;
    const customerName = session.customer_details?.name;
    const amount = session.amount_total / 100; // Convert from cents
    const sessionId = session.id;
    
    console.log('📦 Processing purchase:', {
      email: customerEmail,
      name: customerName,
      amount: amount,
      sessionId: sessionId
    });

    // Determine package based on amount
    let packageName = 'Unknown Package';
    if (amount === 249) packageName = 'Map PowerBoost';
    else if (amount === 347) packageName = 'Cloud Stack Boost';
    else if (amount === 299) packageName = 'Local Citations';
    else if (amount === 849) packageName = 'Platinum Local SEO';
    else if (amount === 1) packageName = 'Test';

    // Create customer data structure
    const customerData = {
      name: customerName || 'Customer',
      email: customerEmail || 'customer@example.com',
      business: (customerName || 'Customer') + ' Business',
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
          estimatedDuration: '30 days',
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
      stripeCustomerId: session.customer || 'cus_' + Date.now(),
      stripeSessionId: sessionId,
      subscriptionStatus: 'Active'
    };

    console.log('✅ Customer data created:', customerData);

    // Store in customer data storage
    const customerKey = `customer-${customerEmail?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'unknown'}`;
    
    // Use the same storage system as API endpoints
    const existingCustomerData = readStorage('customerData.json') || {};
    existingCustomerData[customerKey] = customerData;
    writeStorage('customerData.json', existingCustomerData);
    
    // Also add to users storage if not already there
    const existingUsers = readStorage('users.json') || {};
    const userEmailKey = customerEmail?.toLowerCase();
    if (customerEmail && !existingUsers[userEmailKey]) {
      existingUsers[userEmailKey] = {
        email: customerEmail,
        name: customerName || 'Customer',
        businessName: (customerName || 'Customer') + ' Business',
        isAdmin: false,
        emailVerified: true,
        createdAt: new Date().toISOString(),
        projects: []
      };
      writeStorage('users.json', existingUsers);
    }

    console.log('💾 Customer data stored using storage system');
    console.log('📊 Total customers:', Object.keys(existingCustomerData).length);
    console.log('📊 Total users:', Object.keys(existingUsers).length);
    
    // Dispatch newPurchase event for admin dashboard
    console.log('🎉 New purchase processed successfully!');
    console.log('📧 Customer Email:', customerEmail);
    console.log('👤 Customer Name:', customerName);
    console.log('📦 Package:', packageName);
    console.log('💰 Amount:', amount);
    
  } catch (error) {
    console.error('❌ Error processing purchase:', error);
  }
}

// Helper functions for project data
function getProjectType(packageName) {
  const types = {
    'Map PowerBoost': 'Google Maps Optimization',
    'Cloud Stack Boost': 'Advanced Maps Integration',
    'Local Citations': 'Citation Building',
    'Platinum Local SEO': 'Comprehensive Local SEO',
    'Test': 'Test Service'
  };
  return types[packageName] || 'Local SEO';
}

function getProjectCategory(packageName) {
  const categories = {
    'Map PowerBoost': 'Local SEO',
    'Cloud Stack Boost': 'Technical SEO',
    'Local Citations': 'Local SEO',
    'Platinum Local SEO': 'Local SEO',
    'Test': 'Test'
  };
  return categories[packageName] || 'Local SEO';
}

function getProjectRequirements(packageName) {
  const requirements = {
    'Map PowerBoost': ['Business Information', 'Service Areas', 'Target Keywords'],
    'Cloud Stack Boost': ['Website Access', 'Business Details', 'Target Locations'],
    'Local Citations': ['Business Information', 'Service Categories', 'Local Areas'],
    'Platinum Local SEO': ['Business Information', 'Service Areas', 'Target Keywords', 'Website Access'],
    'Test': ['Test Requirements']
  };
  return requirements[packageName] || ['Business Information'];
}

function getProjectDeliverables(packageName) {
  const deliverables = {
    'Map PowerBoost': ['GMB Optimization', 'Map Rankings', 'Traffic Reports'],
    'Cloud Stack Boost': ['Cloud Stack Setup', 'Map Embeds', 'Performance Analytics'],
    'Local Citations': ['Citation Listings', 'Consistency Reports', 'Local Rankings'],
    'Platinum Local SEO': ['GMB Optimization', 'Citation Building', 'Map Rankings', 'Traffic Reports'],
    'Test': ['Test Deliverables']
  };
  return deliverables[packageName] || ['SEO Optimization'];
}

// API endpoint to get pending purchases
app.get('/api/purchases', (req, res) => {
  try {
    const fs = require('fs');
    const purchasesFile = 'purchases.json';
    
    let purchases = [];
    try {
      purchases = JSON.parse(fs.readFileSync(purchasesFile, 'utf8'));
    } catch (err) {
      // File doesn't exist
    }
    
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load purchases' });
  }
});

// API endpoint to mark purchase as processed
app.post('/api/purchases/:id/process', (req, res) => {
  try {
    const fs = require('fs');
    const purchasesFile = 'purchases.json';
    
    let purchases = [];
    try {
      purchases = JSON.parse(fs.readFileSync(purchasesFile, 'utf8'));
    } catch (err) {
      // File doesn't exist
    }
    
    const purchaseId = req.params.id;
    const purchase = purchases.find(p => p.stripeSessionId === purchaseId);
    
    if (purchase) {
      purchase.processed = true;
      fs.writeFileSync(purchasesFile, JSON.stringify(purchases, null, 2));
      res.json({ success: true, purchase });
    } else {
      res.status(404).json({ error: 'Purchase not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to process purchase' });
  }
});

// API endpoint to get customer data for frontend
app.get('/api/customer-data/:email', (req, res) => {
  try {
    const email = req.params.email;
    const customerData = readStorage('customerData.json') || {};
    const customerKey = `customer-${email.replace(/[^a-zA-Z0-9]/g, '-')}`;
    
    if (customerData[customerKey]) {
      res.json({ success: true, data: customerData[customerKey] });
    } else {
      res.json({ success: false, error: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to load customer data' });
  }
});

// API endpoint to get all customer data for admin dashboard
app.get('/api/all-customers', (req, res) => {
  try {
    const customerData = readStorage('customerData.json') || {};
    const users = readStorage('users.json') || {};
    const onboardingSubmissions = readStorage('onboarding-submissions.json') || [];
    const deletedUsers = readStorage('deletedUsers.json') || [];
    
    res.json({
      success: true,
      customers: customerData,
      users: users,
      onboardingSubmissions: onboardingSubmissions,
      deletedUsers: deletedUsers
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load customer data' });
  }
});

// Endpoint to sync data from frontend (both user and customer data)
app.post('/api/sync-data', (req, res) => {
  try {
    const { email, customerData, userData } = req.body;
    
    console.log('🔄 Syncing data to backend:', { email, hasCustomerData: !!customerData, hasUserData: !!userData });
    
    // Handle user data (from signup)
    if (userData) {
      const existingUsers = readStorage('users.json') || {};
      existingUsers[userData.email.toLowerCase()] = userData;
      writeStorage('users.json', existingUsers);
      console.log('✅ User data synced:', userData.email);
    }
    
    // Handle customer data (from purchases - only if it has active projects)
    if (email && customerData && customerData.activeProjects && customerData.activeProjects.length > 0) {
      const existingData = readStorage('customerData.json') || {};
      const customerKey = `customer-${email.replace(/[^a-zA-Z0-9]/g, '-')}`;
      existingData[customerKey] = customerData;
      writeStorage('customerData.json', existingData);
      console.log('✅ Customer data synced:', email);
    }
    
    res.json({ success: true, message: 'Data synced successfully' });
    
  } catch (error) {
    console.error('❌ Error syncing data:', error);
    res.status(500).json({ error: 'Failed to sync data' });
  }
});

// Endpoint to handle onboarding submissions
app.post('/api/onboarding-submission', (req, res) => {
  try {
    const submissionData = req.body;
    
    // Get existing submissions
    const existingSubmissions = readStorage('onboarding-submissions.json') || [];
    
    // Add new submission
    existingSubmissions.push(submissionData);
    
    // Save to storage
    writeStorage('onboarding-submissions.json', existingSubmissions);
    
    console.log('✅ Onboarding submission received:', submissionData.customerEmail);
    res.json({ success: true, message: 'Onboarding submission saved' });
    
  } catch (error) {
    console.error('❌ Error saving onboarding submission:', error);
    res.status(500).json({ error: 'Failed to save onboarding submission' });
  }
});

// Endpoint to get all onboarding submissions
app.get('/api/onboarding-submissions', (req, res) => {
  try {
    const submissions = readStorage('onboarding-submissions.json') || [];
    res.json({ success: true, submissions });
  } catch (error) {
    console.error('❌ Error retrieving onboarding submissions:', error);
    res.status(500).json({ error: 'Failed to retrieve onboarding submissions' });
  }
});

// Endpoint to get all customers and users
app.get('/api/all-customers', (req, res) => {
  try {
    const customerData = readStorage('customerData.json') || {};
    const users = readStorage('users.json') || {};
    const onboardingSubmissions = readStorage('onboarding-submissions.json') || [];
    const deletedUsers = readStorage('deletedUsers.json') || [];
    
    res.json({
      success: true,
      customers: customerData,
      users: users,
      onboardingSubmissions: onboardingSubmissions,
      deletedUsers: deletedUsers
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load customer data' });
  }
});

// Endpoint to store cancellation requests from users
app.post('/api/cancellation-request', (req, res) => {
  try {
    const { customerEmail, customerName, projectId, reason } = req.body;
    
    console.log('📝 New cancellation request:', { customerEmail, customerName, projectId, reason });
    
    // Get existing cancellation requests
    const existingRequests = readStorage('cancellation-requests.json') || [];
    
    // Create new cancellation request
    const newRequest = {
      id: Date.now().toString(),
      customerEmail,
      customerName,
      projectId,
      reason: reason || 'Customer requested cancellation',
      requestDate: new Date().toISOString(),
      status: 'pending', // pending, approved, denied
      reviewedBy: null,
      reviewedDate: null
    };
    
    // Add to existing requests
    existingRequests.push(newRequest);
    writeStorage('cancellation-requests.json', existingRequests);
    
    console.log('✅ Cancellation request stored successfully');
    res.json({ success: true, message: 'Cancellation request submitted successfully' });
    
  } catch (error) {
    console.error('❌ Error storing cancellation request:', error);
    res.status(500).json({ error: 'Failed to store cancellation request' });
  }
});

// Endpoint to get all cancellation requests for admin dashboard
app.get('/api/cancellation-requests', (req, res) => {
  try {
    const requests = readStorage('cancellation-requests.json') || [];
    res.json({ success: true, requests });
  } catch (error) {
    console.error('❌ Error retrieving cancellation requests:', error);
    res.status(500).json({ error: 'Failed to retrieve cancellation requests' });
  }
});

// Endpoint to process cancellation request (approve/deny)
app.post('/api/process-cancellation', (req, res) => {
  try {
    const { requestId, action, adminName } = req.body; // action: 'approve' or 'deny'
    
    console.log('🔄 Processing cancellation request:', { requestId, action, adminName });
    
    // Get existing requests
    const existingRequests = readStorage('cancellation-requests.json') || [];
    const requestIndex = existingRequests.findIndex(req => req.id === requestId);
    
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Cancellation request not found' });
    }
    
    const request = existingRequests[requestIndex];
    
    // Update request status
    request.status = action === 'approve' ? 'approved' : 'denied';
    request.reviewedBy = adminName || 'Admin';
    request.reviewedDate = new Date().toISOString();
    
    // Save updated requests
    writeStorage('cancellation-requests.json', existingRequests);
    
    if (action === 'approve') {
      // Cancel the project
      const customerData = readStorage('customerData.json') || {};
      let customer = null;
      let customerKey = null;
      
      for (const [key, customerInfo] of Object.entries(customerData)) {
        if (customerInfo.email === request.customerEmail) {
          customer = customerInfo;
          customerKey = key;
          break;
        }
      }
      
      if (customer) {
        // Move project to completed projects
        if (customer.activeProjects) {
          const cancelledProject = customer.activeProjects.find(project => project.id == request.projectId);
          
          if (cancelledProject) {
            // Move project to completed projects
            if (!customer.completedProjects) customer.completedProjects = [];
            customer.completedProjects.push({
              ...cancelledProject,
              status: 'Cancelled',
              cancelledDate: new Date().toISOString(),
              cancelledBy: 'Customer Request',
              completedDate: new Date().toISOString(),
              cancellationReason: request.reason
            });
            
            // Remove from active projects
            customer.activeProjects = customer.activeProjects.filter(project => project.id != request.projectId);
            
            // Add cancellation activity
            if (!customer.recentActivity) customer.recentActivity = [];
            customer.recentActivity.unshift({
              id: Date.now(),
              type: 'project_cancelled',
              message: `Project cancelled by customer request`,
              timestamp: new Date().toISOString(),
              projectId: request.projectId
            });
            
            // Update customer data
            customerData[customerKey] = customer;
            writeStorage('customerData.json', customerData);
            
            console.log('✅ Project cancelled successfully');
          }
        }
      }
    }
    
    console.log(`✅ Cancellation request ${action}d successfully`);
    res.json({ success: true, message: `Cancellation request ${action}d successfully` });
    
  } catch (error) {
    console.error('❌ Error processing cancellation request:', error);
    res.status(500).json({ error: 'Failed to process cancellation request' });
  }
});

// Endpoint to handle project cancellation
app.post('/api/cancel-project', (req, res) => {
  try {
    const { customerEmail, projectId, cancelledBy, isTestPackage } = req.body;
    
    console.log('🚫 Cancelling project:', { customerEmail, projectId, cancelledBy, isTestPackage });
    
    // Get existing customer data
    const customerData = readStorage('customerData.json') || {};
    
    // Find customer by email (search through all customers)
    let customer = null;
    let customerKey = null;
    
    for (const [key, customerInfo] of Object.entries(customerData)) {
      if (customerInfo.email === customerEmail) {
        customer = customerInfo;
        customerKey = key;
        break;
      }
    }
    
    if (customer) {
      console.log('✅ Found customer:', customerEmail, 'with key:', customerKey);
      
      // Update subscription status
      customer.subscriptionStatus = 'Cancelled';
      
      // Update the specific project
      if (customer.activeProjects) {
        const cancelledProject = customer.activeProjects.find(project => project.id == projectId);
        
        if (cancelledProject) {
          if (isTestPackage) {
            // For TEST package (one-time payment) - remove immediately
            if (!customer.completedProjects) customer.completedProjects = [];
            customer.completedProjects.push({
              ...cancelledProject,
              status: 'Cancelled',
              cancelledDate: new Date().toISOString(),
              cancelledBy: cancelledBy || 'Admin',
              completedDate: new Date().toISOString(),
              cancellationReason: 'Customer requested cancellation (one-time payment)'
            });
            
            // Remove from active projects immediately
            customer.activeProjects = customer.activeProjects.filter(project => project.id != projectId);
            
            console.log('✅ Test project cancelled and removed immediately');
          } else {
            // For monthly subscriptions - keep for 30 days
            const billingEndDate = new Date();
            billingEndDate.setDate(billingEndDate.getDate() + 30);
            
            // Move project to completed projects with billing end date
            if (!customer.completedProjects) customer.completedProjects = [];
            customer.completedProjects.push({
              ...cancelledProject,
              status: 'Cancelled',
              cancelledDate: new Date().toISOString(),
              cancelledBy: cancelledBy || 'Admin',
              completedDate: new Date().toISOString(),
              billingEndDate: billingEndDate.toISOString(),
              cancellationReason: cancelledBy === 'Customer' ? 'Customer requested cancellation' : 'Cancelled by admin'
            });
            
            // Remove from active projects
            customer.activeProjects = customer.activeProjects.filter(project => project.id != projectId);
            
            console.log('✅ Project moved to completed projects and removed from active projects');
            console.log('📅 Billing period ends:', billingEndDate.toLocaleDateString());
          }
        }
      }
      
      // Add cancellation activity
      if (!customer.recentActivity) customer.recentActivity = [];
      customer.recentActivity.unshift({
        id: Date.now(),
        type: 'project_cancelled',
        message: isTestPackage ? 'Test project cancelled by customer' : `Project cancelled by ${cancelledBy || 'Admin'}`,
        timestamp: new Date().toISOString(),
        projectId: projectId
      });
      
      // Save updated customer data
      customerData[customerKey] = customer;
      writeStorage('customerData.json', customerData);
      
      // Update onboarding submissions if any
      const existingSubmissions = readStorage('onboarding-submissions.json') || [];
      const updatedSubmissions = existingSubmissions.map(submission => {
        if (submission.customerEmail === customerEmail) {
          return {
            ...submission,
            status: 'cancelled'
          };
        }
        return submission;
      });
      writeStorage('onboarding-submissions.json', updatedSubmissions);
      
      console.log('✅ Project cancelled successfully for:', customerEmail);
      res.json({ 
        success: true, 
        message: 'Project cancelled successfully',
        isTestPackage: isTestPackage,
        billingEndDate: isTestPackage ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      
    } else {
      console.log('❌ Customer not found:', customerEmail);
      console.log('Available customers:', Object.keys(customerData));
      res.status(404).json({ 
        success: false,
        error: 'Customer not found',
        message: 'No customer found with this email address'
      });
    }
    
  } catch (error) {
    console.error('❌ Error cancelling project:', error);
    res.status(500).json({ error: 'Failed to cancel project' });
  }
});

// Test endpoint to manually create customer data (for testing only)
app.post('/api/test/create-customer', (req, res) => {
  try {
    const { email, name, packageName, amount } = req.body;
    
    const customerData = {
      name: name || 'Test Customer',
      email: email || 'test@example.com',
      business: name + ' Business',
      package: packageName || 'Test',
      monthlyRate: amount || 1,
      activeProjects: [
        {
          id: Date.now(),
          name: `${packageName || 'Test'} Package`,
          status: 'Active',
          startDate: new Date().toISOString().split('T')[0],
          progress: 20,
          nextUpdate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          type: 'SEO',
          category: 'Local SEO',
          requirements: ['Business Information', 'Service Details'],
          estimatedDuration: '30 days',
          deliverables: ['SEO Optimization', 'Rankings Report']
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
          message: `Purchase completed: ${packageName || 'Test'} Package`, 
          date: new Date().toISOString().split('T')[0] 
        }
      ],
      subscription: {
        status: 'Active',
        plan: `${packageName || 'Test'} Package`,
        monthlyRate: amount || 1,
        nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      billing: {
        plan: `${packageName || 'Test'} Package`,
        amount: `$${amount || 1}`,
        nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Active'
      },
      stripeCustomerId: 'cus_test_' + Date.now(),
      stripeSessionId: 'cs_test_' + Date.now()
    };
    
    // Store the customer data
    const existingData = readStorage('customerData.json') || {};
    const customerKey = `customer-${email.replace(/[^a-zA-Z0-9]/g, '-')}`;
    existingData[customerKey] = customerData;
    writeStorage('customerData.json', existingData);
    
    console.log('✅ Test customer created:', email);
    res.json({ success: true, customerData });
    
  } catch (error) {
    console.error('❌ Error creating test customer:', error);
    res.status(500).json({ error: 'Failed to create test customer' });
  }
});

// Endpoint to cleanup test data
app.post('/api/cleanup-test-data', (req, res) => {
  try {
    const { testCustomers, testUsers, testSubmissions } = req.body;
    
    console.log('🧹 Cleaning up test data...');
    
    // Clean up test customers
    if (testCustomers && testCustomers.length > 0) {
      const existingCustomerData = readStorage('customerData.json') || {};
      testCustomers.forEach(customerKey => {
        delete existingCustomerData[customerKey];
        console.log('🗑️ Removed test customer:', customerKey);
      });
      writeStorage('customerData.json', existingCustomerData);
    }
    
    // Clean up test users
    if (testUsers && testUsers.length > 0) {
      const existingUsers = readStorage('users.json') || {};
      testUsers.forEach(email => {
        delete existingUsers[email.toLowerCase()];
        console.log('🗑️ Removed test user:', email);
      });
      writeStorage('users.json', existingUsers);
    }
    
    // Clean up test onboarding submissions
    if (testSubmissions && testSubmissions.length > 0) {
      const existingSubmissions = readStorage('onboarding-submissions.json') || [];
      const cleanedSubmissions = existingSubmissions.filter(submission => {
        const isTest = testSubmissions.some(test => 
          test.id === submission.id || 
          test.customerEmail === submission.customerEmail
        );
        if (isTest) {
          console.log('🗑️ Removed test submission:', submission.customerEmail);
        }
        return !isTest;
      });
      writeStorage('onboarding-submissions.json', cleanedSubmissions);
    }
    
    console.log('✅ Test data cleanup completed');
    res.json({ 
      success: true, 
      message: 'Test data cleaned up successfully',
      removed: {
        customers: testCustomers?.length || 0,
        users: testUsers?.length || 0,
        submissions: testSubmissions?.length || 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
    res.status(500).json({ error: 'Failed to cleanup test data' });
  }
});

// Delete user endpoint
app.delete('/api/delete-user/:email', async (req, res) => {
  try {
    const email = req.params.email;
    console.log('🗑️ Deleting user:', email);
    
    // Get current data
    const usersStorage = readStorage('users.json') || {};
    const customerDataStorage = readStorage('customerData.json') || {};
    const onboardingSubmissionsStorage = readStorage('onboarding-submissions.json') || [];
    const deletedUsersStorage = readStorage('deletedUsers.json') || [];
    
    let userRemoved = false;
    let customerRemoved = false;
    let submissionsRemoved = 0;
    
    // Remove user
    if (usersStorage[email.toLowerCase()]) {
      delete usersStorage[email.toLowerCase()];
      userRemoved = true;
    }
    
    // Remove customer data
    for (const [key, customer] of Object.entries(customerDataStorage)) {
      if (customer.email && customer.email.toLowerCase() === email.toLowerCase()) {
        delete customerDataStorage[key];
        customerRemoved = true;
      }
    }
    
    // Remove onboarding submissions
    const updatedSubmissions = onboardingSubmissionsStorage.filter(submission => {
      if (submission.customerEmail && submission.customerEmail.toLowerCase() === email.toLowerCase()) {
        submissionsRemoved++;
        return false;
      }
      return true;
    });
    
    // Clear and update submissions
    onboardingSubmissionsStorage.length = 0;
    onboardingSubmissionsStorage.push(...updatedSubmissions);
    
    // Add to deleted users list
    deletedUsersStorage.push({
      email: email,
      timestamp: new Date().toISOString()
    });
    
    // Save updated data - properly call writeStorage for each data type
    writeStorage('customerData.json', customerDataStorage);
    writeStorage('users.json', usersStorage);
    writeStorage('onboarding-submissions.json', onboardingSubmissionsStorage);
    writeStorage('deletedUsers.json', deletedUsersStorage);
    
    res.json({ 
      success: true, 
      message: 'User deleted successfully',
      removed: {
        user: userRemoved,
        customerData: customerRemoved,
        submissions: submissionsRemoved,
        deletedUsers: deletedUsersStorage.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get deleted users endpoint
app.get('/api/deleted-users', async (req, res) => {
  try {
    const deletedUsersStorage = readStorage('deletedUsers.json') || [];
    console.log('📋 Getting deleted users:', deletedUsersStorage.length, 'users');
    res.json({ 
      success: true, 
      deletedUsers: deletedUsersStorage 
    });
  } catch (error) {
    console.error('❌ Error getting deleted users:', error);
    res.status(500).json({ error: 'Failed to get deleted users' });
  }
});

// Endpoint to delete a customer
app.delete('/api/customers/:email', (req, res) => {
  try {
    const email = req.params.email;
    console.log('🗑️ Deleting customer:', email);
    
    // Get existing customer data
    const existingCustomerData = readStorage('customerData.json') || {};
    
    // Remove the customer
    if (existingCustomerData[email]) {
      delete existingCustomerData[email];
      writeStorage('customerData.json', existingCustomerData);
      console.log('✅ Customer deleted:', email);
      res.json({ success: true, message: 'Customer deleted successfully' });
    } else {
      res.status(404).json({ error: 'Customer not found' });
    }
    
  } catch (error) {
    console.error('❌ Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// File-based storage for production (persists across restarts)
const fs = require('fs');
const path = require('path');

// Helper functions for file-based storage
function readStorage(filename) {
  try {
    const filePath = path.join(__dirname, 'data', filename);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`❌ Error reading ${filename}:`, error);
  }
  
  // Return default empty data based on filename
  if (filename === 'customerData.json') return {};
  if (filename === 'users.json') return {};
  if (filename === 'onboarding-submissions.json') return [];
  if (filename === 'deletedUsers.json') return [];
  if (filename === 'cancellation-requests.json') return [];
  return null;
}

function writeStorage(filename, data) {
  try {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const filePath = path.join(dataDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    // Log storage info
    if (filename === 'customerData.json') {
      console.log('💾 Customer data stored:', Object.keys(data).length, 'customers');
    }
    if (filename === 'users.json') {
      console.log('💾 Users stored:', Object.keys(data).length, 'users');
    }
    if (filename === 'onboarding-submissions.json') {
      console.log('💾 Onboarding submissions stored:', data.length, 'submissions');
    }
    if (filename === 'deletedUsers.json') {
      console.log('💾 Deleted users stored:', data.length, 'deleted users');
    }
    if (filename === 'cancellation-requests.json') {
      console.log('💾 Cancellation requests stored:', data.length, 'requests');
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error writing ${filename}:`, error);
    return false;
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'Server is running with UPDATED CODE!',
    version: '2.0.0', // Force deployment update
    webhookEndpoint: `/api/webhooks/stripe`,
    timestamp: new Date().toISOString()
  });
});

// 404 handler for non-API routes
app.get('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'This is an API server. Please use the frontend application.',
    availableEndpoints: [
      '/api/health',
      '/api/webhooks/stripe',
      '/api/onboarding-submissions',
      '/api/all-customers',
      '/api/sync-data'
    ],
    timestamp: new Date().toISOString() // Force deployment update
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/api/webhooks/stripe`);
  console.log(`📊 Purchases API: http://localhost:${PORT}/api/purchases`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
  console.log(`⚠️  Make sure to set STRIPE_WEBHOOK_SECRET environment variable`);
}); 