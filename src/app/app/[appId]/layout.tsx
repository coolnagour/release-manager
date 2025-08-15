
"use client";

import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Header } from "@/components/header";
import { LayoutDashboard, LogOut, Moon, Settings, Sun, User as UserIcon, Pencil, Tags } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Application } from "@/types/application";
import { getApp } from "@/actions/app-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Role } from "@/types/roles";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const { setTheme } = useTheme();
  const { user, userProfile, logout } = useAuth();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  const appId = Array.isArray(params.appId) ? params.appId[0] : params.appId;

  useEffect(() => {
    if (appId) {
      setLoading(true);
      getApp(appId)
        .then((data) => {
          setApp(data);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [appId]);

  const canEdit = userProfile?.role === Role.SUPERADMIN || userProfile?.role === Role.ADMIN;

  return (
    <SidebarProvider className="min-h-screen">
        <Sidebar>
          <SidebarHeader className="p-2 flex flex-col gap-2">
             <div className="flex justify-between items-center">
                <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-6 w-6"><rect width="256" height="256" fill="none"></rect><path d="M139.3,218.8a20.6,20.6,0,0,1-22.6,0L38.2,166.4a20.6,20.6,0,0,1-11.3-18V67.6a20.6,20.6,0,0,1,11.3-18L116.7,3a20.6,20.6,0,0,1,22.6,0l78.5,46.6a20.6,20.6,0,0,1,11.3,18v80.8a20.6,20.6,0,0,1-11.3,18Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12"></path><path d="M178.4,136.2,100,88.9,64.2,111.4a8,8,0,0,0,4,14.7l72.9,25.2a8,8,0,0,0,8-1.5L178,142A8,8,0,0,0,178.4,136.2Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12"></path></svg>
                    <span className="text-sidebar-primary-foreground group-data-[collapsible=icon]:hidden">Release Manager</span>
                </Link>
                <SidebarTrigger className="md:hidden" />
             </div>
             {loading ? (
                <div className="space-y-2 p-2 group-data-[collapsible=icon]:hidden">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-40" />
                </div>
             ) : app ? (
                <div className="p-2 group-data-[collapsible=icon]:hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="font-semibold text-lg">{app.name}</h2>
                            <p className="text-xs text-muted-foreground">{app.packageName}</p>
                        </div>
                    </div>
                </div>
             ) : null}
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.endsWith("/dashboard")}
                  tooltip="Dashboard"
                >
                  <Link href={`/app/${appId}/dashboard`}>
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.endsWith("/releases")}
                  tooltip="Releases"
                >
                  <Link href={`/app/${appId}/releases`}>
                    <Tags />
                    <span>Releases</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {canEdit && (
                <SidebarMenuItem>
                    <SidebarMenuButton
                    asChild
                    isActive={pathname.endsWith("/edit")}
                    tooltip="Settings"
                    >
                    <Link href={`/app/${appId}/edit`}>
                        <Pencil />
                        <span>Settings</span>
                    </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-2">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                        <div className="flex items-center gap-2 w-full">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user.photoURL ?? ""} alt="User avatar" data-ai-hint="user avatar" />
                                <AvatarFallback>{user.email?.[0].toUpperCase() ?? 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start truncate group-data-[collapsible=icon]:hidden">
                                <span className="font-medium text-sidebar-primary-foreground text-sm truncate">{user.displayName}</span>
                                <span className="text-muted-foreground text-xs truncate">{user.email}</span>
                            </div>
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
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
                  <DropdownMenuItem onClick={() => logout()}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex-1 flex flex-col">
            <header className="p-4 border-b md:hidden">
                <SidebarTrigger />
            </header>
            {children}
        </SidebarInset>
    </SidebarProvider>
  );
}
    
