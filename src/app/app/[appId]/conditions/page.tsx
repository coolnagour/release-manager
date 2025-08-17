
"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Condition } from "@/types/condition";
import { getConditionsForApp, deleteCondition } from "@/actions/condition-actions";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRouter } from "next/navigation";

function ConditionsPage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const appId = Array.isArray(params.appId) ? params.appId[0] : params.appId;

  const canManageConditions = userProfile?.role === Role.SUPERADMIN || userProfile?.role === Role.ADMIN;

  const fetchConditions = () => {
    if (appId) {
      setLoading(true);
      startTransition(() => {
        getConditionsForApp(appId)
          .then(setConditions)
          .finally(() => setLoading(false));
      });
    }
  };

  useEffect(fetchConditions, [appId]);

  const handleDeleteClick = async (conditionId: string) => {
    const result = await deleteCondition(appId, conditionId);
    if(result.success) {
      fetchConditions();
      toast({
        title: "Condition Deleted",
        description: "The condition has been successfully deleted.",
      })
    } else {
      toast({
        title: "Error Deleting Condition",
        description: result.error,
        variant: "destructive",
      })
    }
  }
  
  const getRuleSummary = (condition: Condition) => {
    const rules = [
      { key: 'countries', values: condition.countries },
      { key: 'companies', values: condition.companies },
      { key: 'drivers', values: condition.drivers },
      { key: 'vehicles', values: condition.vehicles }
    ];
    
    const activeRules = rules.filter(rule => rule.values.length > 0);
    if (activeRules.length === 0) return "All users";
    
    return activeRules.map(({ key, values }) => (
      <Badge key={key} variant="secondary" className="mr-1 mb-1 capitalize">
        {key}: {values.length}
      </Badge>
    ))
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Conditions
          </h1>
          <p className="text-muted-foreground">
            Manage release conditions for your users.
          </p>
        </div>
        {canManageConditions && (
          <Button asChild style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}>
            <Link href={`/app/${appId}/conditions/new`}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Condition
            </Link>
          </Button>
        )}
      </div>
      
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
                  <TableHead>Name</TableHead>
                  <TableHead>Rules</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conditions.length > 0 ? (
                  conditions.map((condition) => (
                    <TableRow key={condition.id}>
                      <TableCell className="font-medium">{condition.name}</TableCell>
                      <TableCell>{getRuleSummary(condition)}</TableCell>
                      <TableCell>{new Date(condition.createdAt).toLocaleString()}</TableCell>
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
                            <DropdownMenuItem onClick={() => router.push(`/app/${appId}/conditions/${condition.id}/edit`)}>
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
                                    This action cannot be undone. This will permanently delete this condition.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteClick(condition.id)}>Continue</AlertDialogAction>
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
                    <TableCell colSpan={4} className="text-center">No conditions found.</TableCell>
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

export default ConditionsPage;
