'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/app/firebase/firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Import Shadcn UI components and utils
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; // Import Badge
import { Separator } from "@/components/ui/separator"; // For dividing sections
// Assuming you have icons from lucide-react installed
import { Users, ShoppingCart, Package, CreditCard, TrendingUp, AlertCircle, ShieldAlert } from 'lucide-react';

// Placeholder data (replace with actual data fetching logic)
const stats = [
  { title: "Total Users", value: "2,350", icon: <Users className="w-4 h-4 text-muted-foreground" /> },
  { title: "Total Orders", value: "+150", icon: <ShoppingCart className="w-4 h-4 text-muted-foreground" /> },
  { title: "Products In Stock", value: "1,234", icon: <Package className="w-4 h-4 text-muted-foreground" /> },
  { title: "Total Revenue (30d)", value: "$45,231.89", icon: <CreditCard className="w-4 h-4 text-muted-foreground" /> },
];

const recentActivities = [
  { id: 1, description: "New user registered", timestamp: "10 min ago", type: "user" },
  { id: 2, description: "Order #1021 placed", timestamp: "1h ago", type: "order" },
  { id: 3, description: "Product 'Gadget Pro' updated", timestamp: "2h ago", type: "product" },
  { id: 4, description: "Received new support ticket", timestamp: "5h ago", type: "support" },
];

const quickLinks = [
  { label: "Manage Users", href: "/admin/users", icon: <Users className="mr-2 h-4 w-4" /> },
  { label: "Manage Products", href: "/admin/products", icon: <Package className="mr-2 h-4 w-4" /> },
  { label: "View Orders", href: "/admin/orders", icon: <ShoppingCart className="mr-2 h-4 w-4" /> },
  { label: "View Reports", href: "/admin/reports", icon: <TrendingUp className="mr-2 h-4 w-4" /> },
  { label: "Manage Settings", href: "/admin/settings", icon: null }, // Example without icon
];

// Helper function to determine badge variant based on type (Optional)
const getActivityBadgeVariant = (type: string) => {
  switch (type) {
    case 'user':
      return 'default'; // or 'secondary', 'outline', 'destructive'
    case 'order':
      return 'secondary'; // Choose appropriate variants
    case 'product':
      return 'outline';
    case 'support':
      return 'destructive';
    default:
      return 'secondary';
  }
}

const AdminLandingPage = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); // State to check if the user is an admin

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (currentUser) {
        try {
          const adminRef = doc(db, "admins", currentUser.uid);
          const docSnap = await getDoc(adminRef);
          setIsAdmin(docSnap.exists());
        } catch (error) {
          console.error("Error checking admin role:", error);
          setIsAdmin(false); // Assume not admin on error
        }
      } else {
        setIsAdmin(false);
      }
    };

    if (!loading) {
      checkAdminRole();
    }
  }, [currentUser, loading]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><p className="text-lg text-gray-700">Checking authentication...</p></div>;
  }

  if (!currentUser) {
    router.push('/admin/login');
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-muted/40">
        <ShieldAlert className="w-16 h-16 text-orange-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Unauthorized Access</h2>
        <p className="text-gray-600 mb-4">You do not have permission to view this page.</p>
        <Button asChild variant="outline">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* Sidebar placeholder (optional, depending on your layout) */}
      {/* <aside className="fixed inset-y-0 left-0 z-10 w-14 flex-col border-r bg-background sm:flex">
        {/* Sidebar content goes here */}
      {/* </aside> */}

      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14 w-full"> {/* Adjust pl-14 if sidebar is used */}
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <h1 className="text-xl font-semibold md:text-2xl">Admin Dashboard</h1>
          {/* Add any header elements like user menu, search, etc. here */}
        </header>

        {/* Main Content Area */}
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
          {/* Left Column (Stats and Quick Links) */}
          <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
            {/* Welcome Card (Optional - can remove if header is sufficient) */}
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back, Admin!</CardTitle>
                <CardDescription>Here`s a quick overview of your platform.</CardDescription>
              </CardHeader>
            </Card>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 md:gap-8">
              {stats.map((stat, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    {stat.icon}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    {/* Optional: Add a change indicator */}
                    {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Jump to important sections.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {quickLinks.map((link, index) => (
                  <Button asChild key={index} variant="outline" className="flex items-center justify-start px-4 py-2">
                    <Link href={link.href} className="flex items-center">
                      {link.icon}
                      {link.label}
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column (Recent Activity) */}
          <div className="grid auto-rows-max items-start gap-4 md:gap-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Recent Activity</CardTitle>
                <CardDescription>
                  Your latest platform updates.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {recentActivities.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Icon indicator based on type */}
                        {activity.type === 'user' && <Users className="h-4 w-4 text-muted-foreground" />}
                        {activity.type === 'order' && <ShoppingCart className="h-4 w-4 text-muted-foreground" />}
                        {activity.type === 'product' && <Package className="h-4 w-4 text-muted-foreground" />}
                        {activity.type === 'support' && <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-sm">{activity.description}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Use Badge for type */}
                        <Badge variant={getActivityBadgeVariant(activity.type)}>{activity.type}</Badge>
                        <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                      </div>
                    </div>
                    {index < recentActivities.length - 1 && <Separator />} {/* Add separator between items */}
                  </React.Fragment>
                ))}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLandingPage;