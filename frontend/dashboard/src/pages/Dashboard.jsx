import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { chatAPI, policyAPI } from '../services/api';
import StatsCard from '../components/StatsCard';
import Chart from '../components/Chart';

const Dashboard = () => {
  const { user } = useSelector(state => state.auth);
  const [stats, setStats] = useState({
    totalChats: 0,
    totalPolicies: 0,
    activeUsers: 0,
    avgResponseTime: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [chatsResponse, policiesResponse] = await Promise.all([
        chatAPI.getAllChats({ limit: 1 }),
        policyAPI.getAllPolicies({ limit: 1 })
      ]);

      setStats({
        totalChats: chatsResponse.data.data.pagination.total,
        totalPolicies: policiesResponse.data.data.pagination.total,
        activeUsers: Math.floor(Math.random() * 100) + 50, // Mock data
        avgResponseTime: Math.floor(Math.random() * 5) + 2 // Mock data
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {user?.name}!</h1>
        <p>Here's what's happening with your chatbot today.</p>
      </div>

      <div className="stats-grid">
        <StatsCard
          title="Total Conversations"
          value={stats.totalChats}
          icon="💬"
          trend="+12%"
        />
        <StatsCard
          title="Knowledge Base Articles"
          value={stats.totalPolicies}
          icon="📚"
          trend="+5%"
        />
        <StatsCard
          title="Active Users"
          value={stats.activeUsers}
          icon="👥"
          trend="+8%"
        />
        <StatsCard
          title="Avg Response Time"
          value={`${stats.avgResponseTime}s`}
          icon="⚡"
          trend="-2%"
        />
      </div>

      <div className="charts-section">
        <div className="chart-container">
          <h3>Chat Volume (Last 7 Days)</h3>
          <Chart />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

