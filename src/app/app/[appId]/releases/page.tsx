
"use client";

import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Release } from "@/types/release";
import { getReleasesForApp, deleteRelease, getInternalTrackVersionCodes } from "@/actions/release-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";
import { getApp } from "@/actions/app-actions";
import { Application } from "@/types/application";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import Link from "next/link";


const RELEASES_PER_PAGE = 10;

function ReleasesPage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [releases, setReleases] = useState<Release[]>([]);
  const [totalReleases, setTotalReleases] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [currentPage, setCurrentPage] = useState(1);
  const [app, setApp] = useState<Application | null>(null);
  const [untrackedVCs, setUntrackedVCs] = useState<(string|number)[]>([]);
  const [googlePlayError, setGooglePlayError] = useState<string | null>(null);
  
  const appId = Array.isArray(params.appId) ? params.appId[0] : params.appId;

  const canCreateRelease = userProfile?.role === Role.SUPERADMIN || userProfile?.role === Role.ADMIN;
  
  const fetchReleasesAndPlayData = () => {
    if (appId) {
      setLoading(true);
      startTransition(() => {
        const appPromise = getApp(appId).then(appData => {
          setApp(appData);
          if (appData?.packageName) {
              return getInternalTrackVersionCodes(appData.packageName);
          }
          return Promise.resolve({ data: [] });
        });

        const releasesPromise = getReleasesForApp(appId, currentPage, RELEASES_PER_PAGE);

        Promise.all([appPromise, releasesPromise]).then(([playResult, releasesData]) => {
          setReleases(releasesData.releases);
          setTotalReleases(releasesData.total);

          if (playResult.error) {
              setGooglePlayError(playResult.error);
          } else if (playResult.data) {
              const playStoreVCs = playResult.data;
              const existingVCs = new Set(releasesData.releases.map(r => parseInt(r.versionCode, 10)));
              const untracked = playStoreVCs.filter(vc => !existingVCs.has(Number(vc)));
              setUntrackedVCs(untracked);
          }
          
        }).catch(err => {
          console.error("Failed to fetch data", err);
          setGooglePlayError("Failed to load release or Google Play data.");
        }).finally(() => {
          setLoading(false);
        });
      })
    }
  }

  useEffect(() => {
    fetchReleasesAndPlayData();
  }, [appId, currentPage]);

  const handleDeleteClick = async (releaseId: string) => {
    const result = await deleteRelease(appId, releaseId);
    if(result.success) {
      fetchReleasesAndPlayData(); // Refetch all data
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
            <Button asChild style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}>
              <Link href={`/app/${appId}/releases/new`}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Release
              </Link>
            </Button>
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
      ) : untrackedVCs.length > 0 ? (
        <Alert className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Untracked Releases from Google Play</AlertTitle>
            <AlertDescription>
                The following version codes from the internal track are not in the release manager. Click to add them.
                 <div className="flex flex-wrap gap-2 mt-2">
                    {untrackedVCs.map(vc => (
                        <Button key={vc} variant="outline" size="sm" asChild>
                           <Link href={`/app/${appId}/releases/new?versionCode=${vc}`}>
                             {String(vc)}
                           </Link>
                        </Button>
                    ))}
                </div>
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
                            <DropdownMenuItem onClick={() => router.push(`/app/${appId}/releases/${release.id}/edit`)}>
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
    </div>
  );
}

export default ReleasesPage;
