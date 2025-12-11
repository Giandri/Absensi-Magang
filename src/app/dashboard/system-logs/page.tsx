"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Search, Filter, Download, AlertCircle, CheckCircle, Info, XCircle, Clock, User, Shield, Server } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function SystemLogsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  // Sample system logs data - in real app this would come from API
  const logs = [
    {
      id: 1,
      timestamp: "2024-12-08T14:30:15",
      level: "INFO",
      type: "AUTH",
      user: "admin",
      action: "User login successful",
      details: "Admin user logged in from IP 192.168.1.100",
      ip: "192.168.1.100"
    },
    {
      id: 2,
      timestamp: "2024-12-08T14:25:30",
      level: "WARNING",
      type: "ATTENDANCE",
      user: "john.doe",
      action: "Late check-in detected",
      details: "Employee arrived 15 minutes late",
      ip: "192.168.1.105"
    },
    {
      id: 3,
      timestamp: "2024-12-08T14:20:45",
      level: "ERROR",
      type: "SYSTEM",
      user: "system",
      action: "Database connection failed",
      details: "Connection timeout to database server",
      ip: "localhost"
    },
    {
      id: 4,
      timestamp: "2024-12-08T14:15:20",
      level: "INFO",
      type: "USER",
      user: "admin",
      action: "Employee profile updated",
      details: "Updated contact information for Jane Smith",
      ip: "192.168.1.100"
    },
    {
      id: 5,
      timestamp: "2024-12-08T14:10:10",
      level: "SUCCESS",
      type: "REPORT",
      user: "admin",
      action: "Report generated",
      details: "Monthly attendance report exported to PDF",
      ip: "192.168.1.100"
    },
    {
      id: 6,
      timestamp: "2024-12-08T14:05:55",
      level: "WARNING",
      type: "SECURITY",
      user: "system",
      action: "Failed login attempt",
      details: "Multiple failed login attempts from IP 203.0.113.5",
      ip: "203.0.113.5"
    },
    {
      id: 7,
      timestamp: "2024-12-08T14:00:30",
      level: "INFO",
      type: "BACKUP",
      user: "system",
      action: "Automatic backup completed",
      details: "Daily backup completed successfully",
      ip: "localhost"
    },
    {
      id: 8,
      timestamp: "2024-12-08T13:55:15",
      level: "ERROR",
      type: "API",
      user: "system",
      action: "API rate limit exceeded",
      details: "Too many requests from client application",
      ip: "192.168.1.120"
    }
  ];

  const getLogIcon = (level: string) => {
    switch (level) {
      case "ERROR":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "WARNING":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "INFO":
        return <Info className="h-4 w-4 text-blue-600" />;
      case "SUCCESS":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getLogBadge = (level: string) => {
    switch (level) {
      case "ERROR":
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      case "WARNING":
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case "INFO":
        return <Badge className="bg-blue-100 text-blue-800">Info</Badge>;
      case "SUCCESS":
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "AUTH":
        return <Shield className="h-4 w-4" />;
      case "USER":
        return <User className="h-4 w-4" />;
      case "SYSTEM":
        return <Server className="h-4 w-4" />;
      case "ATTENDANCE":
        return <Clock className="h-4 w-4" />;
      case "REPORT":
        return <Database className="h-4 w-4" />;
      case "SECURITY":
        return <Shield className="h-4 w-4" />;
      case "BACKUP":
        return <Database className="h-4 w-4" />;
      case "API":
        return <Server className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = selectedLevel === "all" || log.level === selectedLevel;
    const matchesType = selectedType === "all" || log.type === selectedType;
    return matchesSearch && matchesLevel && matchesType;
  });

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const logStats = {
    total: logs.length,
    errors: logs.filter(l => l.level === "ERROR").length,
    warnings: logs.filter(l => l.level === "WARNING").length,
    info: logs.filter(l => l.level === "INFO").length,
    success: logs.filter(l => l.level === "SUCCESS").length
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Log Sistem</h1>
            <p className="text-gray-600 mt-1">Pantau aktivitas sistem dan pecahkan masalah</p>
          </div>
          <Button className="bg-yellow-400 hover:bg-yellow-500 text-black">
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Logs</p>
                  <p className="text-2xl font-bold">{logStats.total}</p>
                </div>
                <Database className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{logStats.errors}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Warnings</p>
                  <p className="text-2xl font-bold text-yellow-600">{logStats.warnings}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Info</p>
                  <p className="text-2xl font-bold text-blue-600">{logStats.info}</p>
                </div>
                <Info className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Success</p>
                  <p className="text-2xl font-bold text-green-600">{logStats.success}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Log Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="ERROR">Error</SelectItem>
                  <SelectItem value="WARNING">Warning</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="SUCCESS">Success</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Log Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="AUTH">Authentication</SelectItem>
                  <SelectItem value="USER">User Actions</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                  <SelectItem value="ATTENDANCE">Attendance</SelectItem>
                  <SelectItem value="REPORT">Reports</SelectItem>
                  <SelectItem value="SECURITY">Security</SelectItem>
                  <SelectItem value="BACKUP">Backup</SelectItem>
                  <SelectItem value="API">API</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>System Activity Logs</CardTitle>
            <CardDescription>
              {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Timestamp</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Level</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Action</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Details</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getLogIcon(log.level)}
                          {getLogBadge(log.level)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(log.type)}
                          <span className="text-sm font-medium">{log.type}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm font-medium">{log.user}</td>
                      <td className="py-3 px-4 text-sm">{log.action}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate" title={log.details}>
                        {log.details}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredLogs.length === 0 && (
              <div className="text-center py-12">
                <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Log Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-600" />
                Security Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {logs.filter(l => l.type === "SECURITY" || l.type === "AUTH").length}
              </p>
              <p className="text-sm text-gray-600">Authentication and security-related logs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                User Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {logs.filter(l => l.type === "USER" || l.type === "ATTENDANCE").length}
              </p>
              <p className="text-sm text-gray-600">User actions and attendance events</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-purple-600" />
                System Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">
                {logs.filter(l => l.type === "SYSTEM" || l.type === "API" || l.type === "BACKUP").length}
              </p>
              <p className="text-sm text-gray-600">System operations and maintenance</p>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
}
