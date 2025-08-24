
"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, Rocket, LogOut, Settings, Moon, Sun, Users } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

export function Header() {
  const { setTheme } = useTheme();
  const { user, userProfile, logout, loading } = useAuth();

  const handleLogout = async () => {
    await logout();
  };
  
  return (
    <header className="bg-card border-b sticky top-0 z-10">
      <div className="w-full px-4 md:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Rocket className="h-6 w-6 text-primary" />
            <span className="font-headline">Release Manager</span>
          </Link>
          <div className="flex items-center gap-4">
            {loading ? (
              <Skeleton className="h-10 w-36 rounded-md" />
            ) : userProfile?.isSuperAdmin ? (
                <Button asChild style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}>
                  <Link href="/app/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New App
                  </Link>
                </Button>
            ) : null}
            
            {loading ? (
              <Skeleton className="h-10 w-10 rounded-full" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.photoURL ?? "https://placehold.co/100x100.png"} alt={user.displayName ?? "User Avatar"} data-ai-hint="user avatar" />
                      <AvatarFallback>{user.email?.[0].toUpperCase() ?? 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.displayName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                   {userProfile?.isSuperAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/users">
                        <Users className="mr-2 h-4 w-4" />
                        <span>Manage Users</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                   <DropdownMenuSeparator />
                    <DropdownMenuLabel>Theme</DropdownMenuLabel>
                     <DropdownMenuItem onClick={() => setTheme("light")}>
                      <Sun className="mr-2 h-4 w-4" />
                      <span>Light</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      <Moon className="mr-2 h-4 w-4" />
                      <span>Dark</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>System</span>
                    </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="outline">
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
