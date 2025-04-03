"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex justify-center items-center min-h-screen bg-card">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Search className="text-blue-500 w-16 h-16" />
          </div>
          <CardTitle className="text-3xl text-gray-800">404 - Page Not Found</CardTitle>
          <CardDescription className="text-gray-600">
            Oops! The page you are looking for does not exist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-card-50 border p-3 rounded-lg">
            <p className="text-sm">
              The requested page might have been removed, renamed, or is temporarily unavailable.
            </p>
          </div>

          <div className="flex flex-col space-y-3">
            <Button 
              onClick={() => router.back()} 
              variant="outline" 
              className="w-full"
            >
              Go Back
            </Button>

            <Link href="/" passHref>
              <Button 
                variant="secondary" 
                className="w-full"
              >
                Return to Home
              </Button>
            </Link>

            <Link href="/contact" passHref>
              <Button 
                variant="default" 
                className="w-full"
              >
                Contact Support
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}