const express = require('express');
const cors = require('cors');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_your_test_key_here');

const app = express();
const PORT = process.env.PORT || 3001;



// Middleware
app.use(cors());
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.static(path.join(__dirname, 'build')));

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

    // Create purchase data
    const purchaseData = {
      customerEmail: customerEmail || 'customer@example.com',
      customerName: customerName || 'Customer',
      packageName: packageName,
      amount: amount,
      stripeSessionId: sessionId,
      stripeCustomerId: session.customer || 'cus_' + Date.now()
    };

    console.log('✅ Purchase data created:', purchaseData);

    // Store in a simple file-based database for now
    // In production, you'd use a real database
    const fs = require('fs');
    const purchasesFile = 'purchases.json';
    
    let purchases = [];
    try {
      purchases = JSON.parse(fs.readFileSync(purchasesFile, 'utf8'));
    } catch (err) {
      // File doesn't exist, start with empty array
    }
    
    purchases.push({
      ...purchaseData,
      timestamp: new Date().toISOString(),
      processed: false
    });
    
    fs.writeFileSync(purchasesFile, JSON.stringify(purchases, null, 2));
    console.log('💾 Purchase saved to file');

    // Trigger the existing purchase processing logic
    const result = triggerPurchaseProcessing(purchaseData);
    
    // Mark as processed if successful
    if (result && result.success) {
      purchase.processed = true;
      fs.writeFileSync(purchasesFile, JSON.stringify(purchases, null, 2));
      console.log('✅ Purchase marked as processed');
    }

  } catch (error) {
    console.error('❌ Error processing purchase:', error);
  }
}

// Function to trigger the existing purchase processing logic
function triggerPurchaseProcessing(purchaseData) {
  try {
    // Import the existing purchase handler
    const { handleSuccessfulPurchase } = require('./purchaseHandler.js');
    
    // Create a mock purchase event that matches the existing logic
    const mockPurchaseEvent = {
      customerEmail: purchaseData.customerEmail,
      customerName: purchaseData.customerName,
      packageName: purchaseData.packageName,
      amount: purchaseData.amount,
      stripeSessionId: purchaseData.stripeSessionId
    };

    // Call the existing purchase handler
    handleSuccessfulPurchase(mockPurchaseEvent);
    
    console.log('🔄 Triggered existing purchase processing logic');
    
  } catch (error) {
    console.error('❌ Error triggering purchase processing:', error);
  }
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
    
    res.json({
      success: true,
      customers: customerData,
      users: users,
      onboardingSubmissions: onboardingSubmissions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load customer data' });
  }
});

// API endpoint to sync frontend data with backend
app.post('/api/sync-data', (req, res) => {
  try {
    const { email, customerData, userData } = req.body;
    
    if (email && customerData) {
      const existingData = readStorage('customerData.json') || {};
      const customerKey = `customer-${email.replace(/[^a-zA-Z0-9]/g, '-')}`;
      existingData[customerKey] = customerData;
      writeStorage('customerData.json', existingData);
    }
    
    if (userData) {
      const existingUsers = readStorage('users.json') || {};
      existingUsers[userData.email.toLowerCase()] = userData;
      writeStorage('users.json', existingUsers);
    }
    
    res.json({ success: true, message: 'Data synced successfully' });
  } catch (error) {
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

// Endpoint to handle project cancellation
app.post('/api/cancel-project', (req, res) => {
  try {
    const { customerEmail, projectId, cancelledBy } = req.body;
    
    console.log('🚫 Cancelling project:', { customerEmail, projectId, cancelledBy });
    
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
        customer.activeProjects = customer.activeProjects.map(project => {
          if (project.id == projectId) {
            return {
              ...project,
              status: 'Cancelled',
              cancelledDate: new Date().toISOString(),
              cancelledBy: cancelledBy || 'Admin'
            };
          }
          return project;
        });
      }
      
      // Add cancellation activity
      if (!customer.recentActivity) customer.recentActivity = [];
      customer.recentActivity.unshift({
        id: Date.now(),
        type: 'project_cancelled',
        message: `Project cancelled by ${cancelledBy || 'Admin'}`,
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
      res.json({ success: true, message: 'Project cancelled successfully' });
      
    } else {
      console.log('❌ Customer not found:', customerEmail);
      console.log('Available customers:', Object.keys(customerData));
      res.status(404).json({ error: 'Customer not found' });
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

// Simple in-memory storage for testing (will be replaced with database in production)
let customerDataStorage = {};
let usersStorage = {};
let onboardingSubmissionsStorage = [];

// Helper functions for in-memory storage
function readStorage(filename) {
  if (filename === 'customerData.json') return customerDataStorage;
  if (filename === 'users.json') return usersStorage;
  if (filename === 'onboarding-submissions.json') return onboardingSubmissionsStorage;
  return null;
}

function writeStorage(filename, data) {
  if (filename === 'customerData.json') {
    customerDataStorage = data;
    console.log('💾 Customer data stored:', Object.keys(customerDataStorage).length, 'customers');
  }
  if (filename === 'users.json') {
    usersStorage = data;
    console.log('💾 Users stored:', Object.keys(usersStorage).length, 'users');
  }
  if (filename === 'onboarding-submissions.json') {
    onboardingSubmissionsStorage = data;
    console.log('💾 Onboarding submissions stored:', onboardingSubmissionsStorage.length, 'submissions');
  }
  return true;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'Server is running!',
    webhookEndpoint: `/api/webhooks/stripe`,
    timestamp: new Date().toISOString()
  });
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/api/webhooks/stripe`);
  console.log(`📊 Purchases API: http://localhost:${PORT}/api/purchases`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
  console.log(`⚠️  Make sure to set STRIPE_WEBHOOK_SECRET environment variable`);
}); 