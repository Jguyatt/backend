// Customer Authentication Utility
// This manages customer authentication and project data for fulfillment

// Sample client database (in real app, this would be a database)
const clientDatabase = {};

const customerAuth = {
  // Check if user is a customer
  isCustomer: () => {
    const token = localStorage.getItem('customerToken');
    const data = localStorage.getItem('customerData');
    // Only return true if both token and data exist
    return token !== null && data !== null;
  },

  // Login as a customer (simulate purchase)
  loginAsCustomer: (customerData = {}) => {
    const token = 'demo_customer_token_' + Date.now();
    localStorage.setItem('customerToken', token);
    localStorage.setItem('customerData', JSON.stringify(customerData));
    return true;
  },

  // Logout customer
  logout: () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerData');
  },

  // Clear any cached customer data
  clearCache: () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerData');
  },

  // Force clear Billy's cache and reset to clean state
  resetBillyToCleanState: () => {
    customerAuth.clearCache();
    const billyData = {
      name: 'Billy Bars',
      email: 'billy@billybars.com',
      activeProjects: [],
      orderTimeline: {},
      recentActivity: [],
      subscription: null
    };
    customerAuth.loginAsCustomer(billyData);
    return billyData;
  },

  // Get customer data
  getCustomerData: () => {
    const data = localStorage.getItem('customerData');
    
    // Return stored data or null (no automatic Billy data)
    return data ? JSON.parse(data) : null;
  },

  // Helper function to calculate progress based on completed timeline steps
  calculateProgressFromTimeline: (orderTimeline) => {
    if (!orderTimeline) return 0;
    const completedSteps = Object.values(orderTimeline).filter(step => step.completed).length;
    return Math.min(completedSteps * 20, 100); // Each step is 20%, max 100%
  },

  // Simulate purchase completion
  completePurchase: (packageName) => {
    // Get customer data from localStorage or use defaults
    const existingData = customerAuth.getCustomerData();
    
    // Define pricing for each package
    const packagePricing = {
      'Map PowerBoost': 279,
      'Google Maps iFrame Cloud Stack Boost 🚀': 347,
      'Local Citations for Local SEO': 299,
      'Platinum Local SEO Package': 849
    };
    
    const monthlyRate = packagePricing[packageName] || 279; // Default to Map PowerBoost if unknown
    
    // Define project types and their specific requirements
    const projectTypes = {
      'Map PowerBoost': {
        type: 'Google Maps Optimization',
        category: 'Local SEO',
        requirements: ['Business Information', 'Service Areas', 'Target Keywords'],
        estimatedDuration: '30-45 days',
        deliverables: ['GMB Optimization', 'Map Rankings', 'Traffic Reports']
      },
      'Google Maps iFrame Cloud Stack Boost 🚀': {
        type: 'Advanced Maps Integration',
        category: 'Technical SEO',
        requirements: ['Website Access', 'Business Details', 'Target Locations'],
        estimatedDuration: '45-60 days',
        deliverables: ['Cloud Stack Setup', 'Map Embeds', 'Performance Analytics']
      },
      'Local Citations for Local SEO': {
        type: 'Citation Building',
        category: 'Local SEO',
        requirements: ['Business Information', 'Service Categories', 'Local Areas'],
        estimatedDuration: '30-40 days',
        deliverables: ['Citation Listings', 'NAP Consistency', 'Local Rankings']
      },
      'Platinum Local SEO Package': {
        type: 'Comprehensive Local SEO',
        category: 'Premium Package',
        requirements: ['Complete Business Profile', 'Competitor Analysis', 'Local Strategy'],
        estimatedDuration: '60-90 days',
        deliverables: ['Full Local SEO Suite', 'Monthly Reports', 'Ongoing Optimization']
      }
    };
    
    const projectInfo = projectTypes[packageName] || {
      type: 'Local SEO Service',
      category: 'SEO',
      requirements: ['Business Information'],
      estimatedDuration: '30-45 days',
      deliverables: ['SEO Optimization', 'Rankings Report']
    };
    
    const customerData = {
      name: existingData?.name || 'New Customer',
      email: existingData?.email || 'customer@example.com',
      activeProjects: [
        {
          id: 1,
          name: packageName,
          type: projectInfo.type,
          category: projectInfo.category,
          status: 'Active',
          startDate: new Date().toISOString().split('T')[0],
          progress: 20, // 20% - 1 out of 5 steps completed (Order Placed)
          nextUpdate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          estimatedDuration: projectInfo.estimatedDuration,
          requirements: projectInfo.requirements,
          deliverables: projectInfo.deliverables,
          milestones: {
            orderPlaced: { status: 'completed', date: new Date().toISOString().split('T')[0] },
            onboardingForm: { status: 'pending', date: null },
            orderInProgress: { status: 'pending', date: null },
            reviewDelivery: { status: 'pending', date: null },
            orderComplete: { status: 'pending', date: null }
          },
          currentPhase: 'Order Placed',
          nextMilestone: 'Onboarding Form'
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
          message: `Purchase completed: ${packageName}`, 
          date: new Date().toISOString().split('T')[0] 
        }
      ],
      subscription: {
        status: 'Active',
        plan: packageName,
        monthlyRate: monthlyRate,
        nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    };
    
    customerAuth.loginAsCustomer(customerData);
    return customerData;
  },





  // Admin functions for fulfillment
  admin: {
    // Get all clients
    getAllClients: () => {
      // Return Billy's data for admin to see
      const billyClient = {
        id: 'client_billy_bars',
        name: 'Billy Bars',
        email: 'billy@billybars.com',
        business: 'Billy Bars',
        activeProjects: [
          {
            id: 1,
            name: 'Map PowerBoost Package',
            status: 'Active',
            startDate: new Date().toISOString().split('T')[0],
            progress: 20, // 20% - 1 out of 5 steps completed
            nextUpdate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            recentActivity: [
              {
                type: 'progress_update',
                message: 'Project started - Initial setup completed',
                date: new Date().toISOString().split('T')[0]
              }
            ]
          }
        ],
        billing: {
          plan: 'Map PowerBoost Package',
          amount: '$279',
          nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'Active'
        },
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
            message: 'Purchase completed: Map PowerBoost Package', 
            date: new Date().toISOString().split('T')[0] 
          }
        ]
      };
      
      return [billyClient];
    },

    // Get specific client by email
    getClientByEmail: (email) => {
      return clientDatabase[email] || null;
    },

    // Update client project data
    updateProjectData: (clientEmail, projectId, updates) => {
      if (!clientDatabase[clientEmail]) {
        return { success: false, error: 'Client not found' };
      }

      const client = clientDatabase[clientEmail];
      const project = client.activeProjects.find(p => p.id === projectId);
      
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      // Update project data
      Object.assign(project, updates);

      // Add activity log entry
      if (updates.progress !== undefined) {
        project.recentActivity.unshift({
          type: 'progress_update',
          message: `Progress updated to ${updates.progress}%`,
          date: new Date().toISOString().split('T')[0],
          details: updates.notes || 'Progress update'
        });
      }

      return { success: true, data: project };
    },

    // Add new activity to project
    addProjectActivity: (clientEmail, projectId, activity) => {
      if (!clientDatabase[clientEmail]) {
        return { success: false, error: 'Client not found' };
      }

      const client = clientDatabase[clientEmail];
      const project = client.activeProjects.find(p => p.id === projectId);
      
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      project.recentActivity.unshift({
        ...activity,
        date: new Date().toISOString().split('T')[0]
      });

      return { success: true, data: project };
    },

    // Update fulfillment data
    updateFulfillmentData: (clientEmail, projectId, fulfillmentData) => {
      if (!clientDatabase[clientEmail]) {
        return { success: false, error: 'Client not found' };
      }

      const client = clientDatabase[clientEmail];
      const project = client.activeProjects.find(p => p.id === projectId);
      
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      project.fulfillmentData = { ...project.fulfillmentData, ...fulfillmentData };

      return { success: true, data: project };
    },

    // Add new client
    addClient: (clientData) => {
      const email = clientData.email;
      if (clientDatabase[email]) {
        return { success: false, error: 'Client already exists' };
      }

      clientDatabase[email] = {
        id: 'client_' + Date.now(),
        ...clientData,
        activeProjects: [],
        billing: {
          plan: clientData.plan || 'Basic',
          amount: clientData.amount || '$0',
          nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'Active'
        }
      };

      return { success: true, data: clientDatabase[email] };
    },

    // Add project to client
    addProjectToClient: (clientEmail, projectData) => {
      if (!clientDatabase[clientEmail]) {
        return { success: false, error: 'Client not found' };
      }

      const newProject = {
        id: 'proj_' + Date.now(),
        status: 'Active',
        startDate: new Date().toISOString().split('T')[0],
        progress: 0,
        nextUpdate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        recentActivity: [],
        ...projectData
      };

      clientDatabase[clientEmail].activeProjects.push(newProject);

      return { success: true, data: newProject };
    },

    // Update timeline status
    updateTimelineStatus: (clientEmail, timelineStep, status) => {
      if (!clientDatabase[clientEmail]) {
        return { success: false, error: 'Client not found' };
      }

      const client = clientDatabase[clientEmail];
      if (!client.orderTimeline || !client.orderTimeline[timelineStep]) {
        return { success: false, error: 'Timeline step not found' };
      }

      client.orderTimeline[timelineStep] = {
        status: status,
        date: status === 'completed' ? new Date().toISOString().split('T')[0] : null,
        completed: status === 'completed'
      };

      // Add activity log entry
      const stepNames = {
        orderPlaced: 'Order Placed',
        onboardingForm: 'Onboarding Form',
        orderInProgress: 'Order In Progress',
        reviewDelivery: 'Review Delivery',
        orderComplete: 'Order Complete'
      };

      client.recentActivity.unshift({
        type: 'timeline_update',
        message: `${stepNames[timelineStep]} status updated to ${status}`,
        date: new Date().toISOString().split('T')[0],
        details: `Timeline step "${stepNames[timelineStep]}" marked as ${status}`
      });

      return { success: true, data: client.orderTimeline };
    }
  }
};

module.exports = { customerAuth }; 