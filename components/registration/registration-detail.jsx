"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, titleCase } from "@/lib/format";

export function RegisteredCourses({ registration }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-6">Code</TableHead>
          <TableHead>Course</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="pr-6 text-right">Credits</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {registration.courses.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="pl-6 font-medium">{c.course_code}</TableCell>
            <TableCell>
              {c.course_title}
              {c.is_retake && <Badge variant="outline" className="ml-2">Retake</Badge>}
            </TableCell>
            <TableCell>{titleCase(c.category)}</TableCell>
            <TableCell className="pr-6 text-right tabular-nums">{c.credits}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3} className="pl-6">
            Total
          </TableCell>
          <TableCell className="pr-6 text-right tabular-nums">{registration.total_credits}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

export function RegistrationTimeline({ events }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm">
          {events.map((event) => (
            <li key={event.id} className="border-l-2 pl-3">
              <p className="font-medium">
                {event.action_display}
                {event.course_code && ` · ${event.course_code}`}
                {event.on_behalf && <Badge variant="outline" className="ml-2">By registry</Badge>}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(event.created_at)} · {event.actor_name || "System"}
              </p>
              {event.reason && <p className="mt-0.5 text-muted-foreground">{event.reason}</p>}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
