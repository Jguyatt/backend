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
    triggerPurchaseProcessing(purchaseData);

  } catch (error) {
    console.error('❌ Error processing purchase:', error);
  }
}

// Function to trigger the existing purchase processing logic
function triggerPurchaseProcessing(purchaseData) {
  try {
    // Import the existing purchase handler
    const { handleSuccessfulPurchase } = require('./src/utils/purchaseHandler.js');
    
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