import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Building, CalendarDays, Phone, MapPin, Shield } from 'lucide-react';

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  // Handle both ISO string and timestamp object
  const date = typeof timestamp === 'string' 
    ? new Date(timestamp) 
    : new Date(timestamp.seconds * 1000);
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const InfoItem = ({ icon, label, value }) => (
  <div className="flex items-center space-x-2">
    {icon}
    <span className="text-sm font-medium">{label}:</span>
    <span className="text-sm">{value || 'N/A'}</span>
  </div>
);

export function UserDetails({ user }) {
  const getRoleColor = (role) => {
    switch (role) {
      case 'General-Manager':
        return 'default';
      case 'Manager':
        return 'secondary';
      case 'Cashier':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-sm border-muted">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20 border-2 border-primary/10">
            <AvatarFallback className="text-2xl bg-primary/5">{user.name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{user.name || 'Unnamed User'}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{user.email || 'N/A'}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant={getRoleColor(user.role)}>
                {user.role || 'User'}
              </Badge>
              {user.role === 'General-Manager' && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Admin Access
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem icon={<Mail className="h-4 w-4 text-muted-foreground" />} label="Email" value={user.email} />
            <InfoItem icon={<Phone className="h-4 w-4 text-muted-foreground" />} label="Phone" value={user.phone} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem icon={<Building className="h-4 w-4 text-muted-foreground" />} label="Branch" value={user.branchName} />
            <InfoItem icon={<MapPin className="h-4 w-4 text-muted-foreground" />} label="Branch Location" value={user.branchLocation} />
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Created At</h3>
            <div className="flex items-center text-muted-foreground">
              <CalendarDays className="mr-2 h-4 w-4" />
              <span className="text-sm">{formatDate(user.createdAt)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Last Updated</h3>
            <div className="flex items-center text-muted-foreground">
              <CalendarDays className="mr-2 h-4 w-4" />
              <span className="text-sm">{formatDate(user.updatedAt)}</span>
            </div>
          </div>
        </div>

        {user.permissions && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold mb-3">Permissions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(user.permissions).map(([category, perms]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-sm font-medium capitalize">{category}</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(perms).map(([perm, value]) => (
                        value && (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {perm.replace(/can|([A-Z])/g, (match, p1) => p1 ? ` ${p1}` : '').trim()}
                          </Badge>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
