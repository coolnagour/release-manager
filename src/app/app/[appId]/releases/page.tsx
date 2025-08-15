
"use client";

import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { useParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Release } from "@/types/release";
import { getReleasesForApp, deleteRelease, getInternalTrackVersionCodes } from "@/actions/release-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateReleaseForm } from "@/components/create-release-form";
import { useAuth } from "@/contexts/auth-context";
import { Role } from "@/types/roles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditReleaseForm } from "@/components/edit-release-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";
import { getApp } from "@/actions/app-actions";
import { Application } from "@/types/application";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";


const RELEASES_PER_PAGE = 10;

function ReleasesPage() {
  const params = useParams();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [releases, setReleases] = useState<Release[]>([]);
  const [totalReleases, setTotalReleases] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [app, setApp] = useState<Application | null>(null);
  const [internalTrackVCs, setInternalTrackVCs] = useState<(string|number)[]>([]);
  const [googlePlayError, setGooglePlayError] = useState<string | null>(null);

  const appId = Array.isArray(params.appId) ? params.appId[0] : params.appId;

  const canCreateRelease = userProfile?.role === Role.SUPERADMIN || userProfile?.role === Role.ADMIN;

  useEffect(() => {
    if (appId) {
      setLoading(true);
      getApp(appId).then(appData => {
        setApp(appData);
        if (appData?.packageName) {
            getInternalTrackVersionCodes(appData.packageName).then(result => {
                if (result.data) {
                    setInternalTrackVCs(result.data);
                }
                if (result.error) {
                    setGooglePlayError(result.error);
                }
            })
        }
      });
      startTransition(() => {
        getReleasesForApp(appId, currentPage, RELEASES_PER_PAGE)
          .then((data) => {
            setReleases(data.releases);
            setTotalReleases(data.total);
          })
          .finally(() => {
            setLoading(false);
          });
      })
    }
  }, [appId, currentPage]);

  const fetchReleases = () => {
     if (appId) {
      setLoading(true);
      startTransition(() => {
        getReleasesForApp(appId, currentPage, RELEASES_PER_PAGE)
          .then((data) => {
            setReleases(data.releases);
            setTotalReleases(data.total);
            const totalPages = Math.ceil(data.total / RELEASES_PER_PAGE);
            if(currentPage > totalPages && totalPages > 0) {
              setCurrentPage(totalPages);
            }
          })
          .finally(() => {
            setLoading(false);
          });
      })
    }
  }

  const handleReleaseCreated = (newRelease: Release) => {
    fetchReleases();
    setIsCreateDialogOpen(false);
  }

  const handleReleaseUpdated = (updatedRelease: Release) => {
    setReleases(releases.map(r => r.id === updatedRelease.id ? updatedRelease : r));
    setIsEditDialogOpen(false);
    setSelectedRelease(null);
  }

  const handleEditClick = (release: Release) => {
    setSelectedRelease(release);
    setIsEditDialogOpen(true);
  }

  const handleDeleteClick = async (releaseId: string) => {
    const result = await deleteRelease(appId, releaseId);
    if(result.success) {
      fetchReleases();
      toast({
        title: "Release Deleted",
        description: "The release has been successfully deleted.",
      })
    } else {
      toast({
        title: "Error Deleting Release",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  const getBadgeVariant = (status: string) => {
    switch (status) {
        case 'active':
            return 'active';
        case 'paused':
            return 'paused';
        case 'deprecated':
            return 'deprecated';
        case 'archived':
            return 'archived';
        default:
            return 'secondary';
    }
  }

  const totalPages = Math.ceil(totalReleases / RELEASES_PER_PAGE);


  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Releases
          </h1>
          <p className="text-muted-foreground">
            Manage your application releases.
          </p>
        </div>
        {canCreateRelease && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Release
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Release</DialogTitle>
                <DialogDescription>
                  Enter the details for your new release.
                </DialogDescription>
              </DialogHeader>
              <CreateReleaseForm appId={appId} onReleaseCreated={handleReleaseCreated} />
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      {googlePlayError ? (
         <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Google Play API Error</AlertTitle>
            <AlertDescription>
                {googlePlayError}
            </AlertDescription>
        </Alert>
      ) : internalTrackVCs.length > 0 ? (
        <Alert className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Google Play Internal Track</AlertTitle>
            <AlertDescription>
                The following version codes are active in the internal track: {internalTrackVCs.join(', ')}
            </AlertDescription>
        </Alert>
      ) : null}


      <Card className="flex-1 flex flex-col">
        <CardContent className="pt-6 flex-1">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version Name</TableHead>
                  <TableHead>Version Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {releases.length > 0 ? (
                  releases.map((release) => (
                    <TableRow key={release.id}>
                      <TableCell className="font-medium">{release.versionName}</TableCell>
                      <TableCell>{release.versionCode}</TableCell>
                      <TableCell>
                        <Badge variant={getBadgeVariant(release.status)} className="capitalize">{release.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(release.createdAt).toLocaleString()}</TableCell>
                       <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditClick(release)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete this release.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteClick(release.id)}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No releases found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
         {totalPages > 1 && (
            <CardFooter className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1 || isPending}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages || isPending}
                    >
                        Next
                    </Button>
                </div>
            </CardFooter>
        )}
      </Card>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Edit Release</DialogTitle>
                <DialogDescription>
                    Update the details for your release.
                </DialogDescription>
            </DialogHeader>
            {selectedRelease && (
                <EditReleaseForm
                    appId={appId}
                    release={selectedRelease}
                    onReleaseUpdated={handleReleaseUpdated}
                />
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ReleasesPage;
