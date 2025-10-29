describe('Reports Viewing Workflow', () => {
  beforeEach(() => {
    // Clear localStorage and cookies before each test
    cy.clearLocalStorage();
    cy.clearCookies();
    
    // Mock authentication
    cy.window().then((win) => {
      win.localStorage.setItem('authToken', 'test-auth-token');
      win.localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg'
      }));
    });
    
    // Visit the reports page
    cy.visit('/reports');
  });

  it('should display reports page correctly', () => {
    // Check if reports page elements are visible
    cy.get('[data-testid="reports-page"]').should('be.visible');
    cy.get('[data-testid="page-title"]').should('contain.text', 'Analysis Reports');
    cy.get('[data-testid="reports-list"]').should('be.visible');
    cy.get('[data-testid="filter-controls"]').should('be.visible');
    cy.get('[data-testid="search-input"]').should('be.visible');
  });

  it('should display list of reports', () => {
    // Mock reports data
    cy.mockApiResponse('GET', '**/rest/v1/reports?user_id=eq.test-user-123', {
      data: [
        {
          id: 'report-1',
          title: 'Video Analysis Report',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          analysis_type: 'video',
          overall_accuracy: 0.85,
          total_frames: 100,
          successful_detections: 85,
          status: 'completed'
        },
        {
          id: 'report-2',
          title: 'Camera Analysis Report',
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
          analysis_type: 'camera',
          overall_accuracy: 0.92,
          total_frames: 50,
          successful_detections: 46,
          status: 'completed'
        }
      ]
    });
    
    // Check if reports are displayed
    cy.get('[data-testid="report-item-1"]').should('be.visible');
    cy.get('[data-testid="report-item-2"]').should('be.visible');
    cy.get('[data-testid="report-title-1"]').should('contain.text', 'Video Analysis Report');
    cy.get('[data-testid="report-title-2"]').should('contain.text', 'Camera Analysis Report');
    cy.get('[data-testid="report-date-1"]').should('be.visible');
    cy.get('[data-testid="report-date-2"]').should('be.visible');
  });

  it('should handle empty reports list', () => {
    // Mock empty reports data
    cy.mockApiResponse('GET', '**/rest/v1/reports?user_id=eq.test-user-123', {
      data: []
    });
    
    // Check empty state
    cy.get('[data-testid="empty-reports"]').should('be.visible');
    cy.get('[data-testid="empty-reports-message"]').should('contain.text', 'No reports found');
  });

  it('should filter reports by analysis type', () => {
    // Mock reports data
    cy.mockApiResponse('GET', '**/rest/v1/reports?user_id=eq.test-user-123', {
      data: [
        {
          id: 'report-1',
          title: 'Video Analysis Report',
          analysis_type: 'video',
          status: 'completed'
        },
        {
          id: 'report-2',
          title: 'Camera Analysis Report',
          analysis_type: 'camera',
          status: 'completed'
        }
      ]
    });
    
    // Filter by video analysis
    cy.get('[data-testid="filter-dropdown"]').click();
    cy.get('[data-testid="filter-video"]').click();
    
    // Check if only video reports are shown
    cy.get('[data-testid="report-item-1"]').should('be.visible');
    cy.get('[data-testid="report-item-2"]').should('not.exist');
    
    // Filter by camera analysis
    cy.get('[data-testid="filter-dropdown"]').click();
    cy.get('[data-testid="filter-camera"]').click();
    
    // Check if only camera reports are shown
    cy.get('[data-testid="report-item-2"]').should('be.visible');
    cy.get('[data-testid="report-item-1"]').should('not.exist');
  });

  it('should search reports by title', () => {
    // Mock reports data
    cy.mockApiResponse('GET', '**/rest/v1/reports?user_id=eq.test-user-123', {
      data: [
        {
          id: 'report-1',
          title: 'Video Analysis Report',
          analysis_type: 'video',
          status: 'completed'
        },
        {
          id: 'report-2',
          title: 'Camera Analysis Report',
          analysis_type: 'camera',
          status: 'completed'
        }
      ]
    });
    
    // Search for "Video"
    cy.get('[data-testid="search-input"]').type('Video');
    
    // Check if only matching reports are shown
    cy.get('[data-testid="report-item-1"]').should('be.visible');
    cy.get('[data-testid="report-item-2"]').should('not.exist');
  });

  it('should sort reports by date', () => {
    // Mock reports data
    cy.mockApiResponse('GET', '**/rest/v1/reports?user_id=eq.test-user-123', {
      data: [
        {
          id: 'report-1',
          title: 'Old Report',
          created_at: '2023-01-01T00:00:00Z',
          status: 'completed'
        },
        {
          id: 'report-2',
          title: 'New Report',
          created_at: '2023-01-02T00:00:00Z',
          status: 'completed'
        }
      ]
    });
    
    // Sort by newest first
    cy.get('[data-testid="sort-dropdown"]').click();
    cy.get('[data-testid="sort-newest"]').click();
    
    // Check if reports are sorted correctly
    cy.get('[data-testid="report-item-2"]').should('be.visible');
    cy.get('[data-testid="report-item-1"]').should('be.visible');
  });

  it('should navigate to report details', () => {
    // Mock reports data
    cy.mockApiResponse('GET', '**/rest/v1/reports?user_id=eq.test-user-123', {
      data: [
        {
          id: 'report-1',
          title: 'Video Analysis Report',
          created_at: '2023-01-01T00:00:00Z',
          status: 'completed'
        }
      ]
    });
    
    // Mock report details data
    cy.mockApiResponse('GET', '**/rest/v1/reports?id=eq.report-1', {
      data: [
        {
          id: 'report-1',
          title: 'Video Analysis Report',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          summary: 'Test summary',
          overall_accuracy: 0.85,
          total_frames: 100,
          successful_detections: 85,
          report_data: {
            strengths: ['Good accuracy', 'Consistent performance'],
            areas_for_improvement: ['Improve timing'],
            coaching_advice: 'Focus on trigger control'
          },
          is_public: false
        }
      ]
    });
    
    // Click on report
    cy.get('[data-testid="report-item-1"]').click();
    
    // Check if navigated to report details
    cy.url().should('include', '/reports/report-1');
    cy.get('[data-testid="report-details"]').should('be.visible');
    cy.get('[data-testid="report-title"]').should('contain.text', 'Video Analysis Report');
    cy.get('[data-testid="report-summary"]').should('contain.text', 'Test summary');
    cy.get('[data-testid="accuracy-display"]').should('contain.text', '85%');
  });

  it('should delete a report', () => {
    // Mock reports data
    cy.mockApiResponse('GET', '**/rest/v1/reports?user_id=eq.test-user-123', {
      data: [
        {
          id: 'report-1',
          title: 'Video Analysis Report',
          status: 'completed'
        }
      ]
    });
    
    // Mock delete response
    cy.mockApiResponse('DELETE', '**/rest/v1/reports?id=eq.report-1', {
      data: null
    });
    
    // Click delete button
    cy.get('[data-testid="delete-report-1"]').click();
    
    // Confirm deletion
    cy.get('[data-testid="confirm-delete"]').click();
    
    // Check if report is deleted
    cy.get('[data-testid="report-item-1"]').should('not.exist');
    cy.get('[data-testid="delete-success-message"]').should('be.visible');
  });

  it('should share a report', () => {
    // Mock reports data
    cy.mockApiResponse('GET', '**/rest/v1/reports?user_id=eq.test-user-123', {
      data: [
        {
          id: 'report-1',
          title: 'Video Analysis Report',
          is_public: false,
          status: 'completed'
        }
      ]
    });
    
    // Mock share response
    cy.mockApiResponse('POST', '**/rest/v1/reports?id=eq.report-1', {
      data: { share_token: 'share-token-123' }
    });
    
    // Click share button
    cy.get('[data-testid="share-report-1"]').click();
    
    // Check share dialog
    cy.get('[data-testid="share-dialog"]').should('be.visible');
    cy.get('[data-testid="share-link"]').should('be.visible');
    
    // Copy share link
    cy.get('[data-testid="copy-link"]').click();
    
    // Check success message
    cy.get('[data-testid="copy-success"]').should('be.visible');
  });

  it('should export report to PDF', () => {
    // Mock reports data
    cy.mockApiResponse('GET', '**/rest/v1/reports?user_id=eq.test-user-123', {
      data: [
        {
          id: 'report-1',
          title: 'Video Analysis Report',
          status: 'completed'
        }
      ]
    });
    
    // Mock PDF export
    cy.mockApiResponse('POST', '**/functions/v1/export-pdf', {
      data: { url: 'https://example.com/report.pdf' }
    });
    
    // Click export button
    cy.get('[data-testid="export-report-1"]').click();
    
    // Select PDF format
    cy.get('[data-testid="export-pdf"]').click();
    
    // Check if export starts
    cy.get('[data-testid="export-progress"]').should('be.visible');
    cy.get('[data-testid="export-success"]').should('be.visible');
  });

  it('should handle loading states', () => {
    // Mock delayed response
    cy.mockApiResponse('GET', '**/rest/v1/reports?user_id=eq.test-user-123', {
      data: [
        {
          id: 'report-1',
          title: 'Video Analysis Report',
          status: 'completed'
        }
      ],
      delay: 1000
    });
    
    // Check loading state
    cy.get('[data-testid="loading-spinner"]').should('be.visible');
    
    // Wait for data to load
    cy.get('[data-testid="report-item-1"]').should('be.visible');
    cy.get('[data-testid="loading-spinner"]').should('not.exist');
  });

  it('should handle error states', () => {
    // Mock error response
    cy.mockApiResponse('GET', '**/rest/v1/reports?user_id=eq.test-user-123', {
      error: { message: 'Failed to load reports' }
    });
    
    // Check error message
    cy.get('[data-testid="error-message"]').should('be.visible');
    cy.get('[data-testid="error-message"]').should('contain.text', 'Failed to load reports');
    cy.get('[data-testid="retry-button"]').should('be.visible');
  });

  it('should paginate reports list', () => {
    // Mock paginated reports data
    cy.mockApiResponse('GET', '**/rest/v1/reports?user_id=eq.test-user-123&limit=10&offset=0', {
      data: Array.from({ length: 10 }, (_, i) => ({
        id: `report-${i + 1}`,
        title: `Report ${i + 1}`,
        status: 'completed'
      }))
    });
    
    // Check pagination controls
    cy.get('[data-testid="pagination"]').should('be.visible');
    cy.get('[data-testid="next-page"]').should('be.visible');
    
    // Click next page
    cy.get('[data-testid="next-page"]').click();
    
    // Mock second page data
    cy.mockApiResponse('GET', '**/rest/v1/reports?user_id=eq.test-user-123&limit=10&offset=10', {
      data: Array.from({ length: 5 }, (_, i) => ({
        id: `report-${i + 11}`,
        title: `Report ${i + 11}`,
        status: 'completed'
      }))
    });
    
    // Check if second page is loaded
    cy.get('[data-testid="report-item-11"]').should('be.visible');
  });
});