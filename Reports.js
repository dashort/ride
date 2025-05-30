function generateReportData(filters) {
  try {
    console.log('Generating report data with filters:', filters);
    
    const requestsData = getRequestsData();
    const assignmentsData = getAssignmentsData();
    const ridersData = getRidersData();
    
    // Filter data based on date range
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);
    
    const filteredRequests = requestsData.data.filter(request => {
      const requestDate = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.date);
      const requestType = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.type);
      const status = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.status);
      
      let matchesDate = true;
      if (requestDate instanceof Date) {
        matchesDate = requestDate >= startDate && requestDate <= endDate;
      }
      
      let matchesType = true;
      if (filters.requestType) {
        matchesType = requestType === filters.requestType;
      }
      
      let matchesStatus = true;
      if (filters.status) {
        matchesStatus = status === filters.status;
      }
      
      return matchesDate && matchesType && matchesStatus;
    });
    
    // Calculate summary statistics
    const totalRequests = filteredRequests.length;
    const completedRequests = filteredRequests.filter(request => 
      getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.status) === 'Completed'
    ).length;
    
    const activeRiders = ridersData.data.filter(rider =>
      getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.status) === 'Active'
    ).length;
    
    // Calculate request types distribution
    const requestTypes = {};
    filteredRequests.forEach(request => {
      const type = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.type) || 'Unknown';
      requestTypes[type] = (requestTypes[type] || 0) + 1;
    });
    
    // Calculate rider performance
    const riderPerformance = [];
    ridersData.data.forEach(rider => {
      const riderName = getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.name);
      if (!riderName) return;
      
      const assignments = assignmentsData.data.filter(assignment => {
        const assignmentRider = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const createdDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.createdDate);
        
        let matchesDate = true;
        if (createdDate instanceof Date) {
          matchesDate = createdDate >= startDate && createdDate <= endDate;
        }
        
        return assignmentRider === riderName && matchesDate;
      });
      
      if (assignments.length > 0) {
        const completed = assignments.filter(assignment =>
          getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status) === 'Completed'
        ).length;
        
        riderPerformance.push({
          name: riderName,
          assignments: assignments.length,
          completionRate: assignments.length > 0 ? Math.round((completed / assignments.length) * 100) : 0,
          rating: 4.5 // Placeholder - you might want to add actual rating system
        });
      }
    });
    
    const reportData = {
      summary: {
        totalRequests: totalRequests,
        completedRequests: completedRequests,
        activeRiders: activeRiders,
        avgResponseTime: '2.3 hours' // Placeholder - calculate actual response time
      },
      charts: {
        requestVolume: {
          total: totalRequests,
          peakDay: 'Monday', // Placeholder
          trend: '+15%' // Placeholder
        },
        requestTypes: requestTypes,
        monthlyTrends: {
          average: Math.round(totalRequests / 3),
          growth: 12 // Placeholder
        }
      },
      tables: {
        riderPerformance: riderPerformance.sort((a, b) => b.assignments - a.assignments),
        responseTime: {
          average: '2.3 hours',
          fastest: '0.5 hours',
          slowest: '8.2 hours'
        }
      }
    };
    
    return reportData;
    
  } catch (error) {
    logError('Error generating report data', error);
    throw error;
  }
}