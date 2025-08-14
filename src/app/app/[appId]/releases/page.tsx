
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Release } from "@/types/release";
import { getReleasesForApp, createRelease } from "@/actions/release-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge";


function ReleasesPage() {
  const params = useParams();
  const { userProfile } = useAuth();
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const appId = Array.isArray(params.appId) ? params.appId[0] : params.appId;

  const canCreateRelease = userProfile?.role === Role.SUPERADMIN || userProfile?.role === Role.ADMIN;

  useEffect(() => {
    if (appId) {
      getReleasesForApp(appId)
        .then((data) => {
          setReleases(data);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [appId]);

  const handleReleaseCreated = (newRelease: Release) => {
    setReleases([newRelease, ...releases]);
    setIsDialogOpen(false);
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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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

      <Card>
        <CardContent className="pt-6">
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
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">No releases found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ReleasesPage;
