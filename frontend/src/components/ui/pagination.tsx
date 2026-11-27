import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";
export function Pagination({ className, ...props }: React.ComponentProps<"nav">) { return <nav role="navigation" aria-label="pagination" data-slot="pagination" className={cn("ui-pagination", className)} {...props} />; }
export function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) { return <ul data-slot="pagination-content" className={cn("ui-pagination-content", className)} {...props} />; }
export function PaginationItem(props: React.ComponentProps<"li">) { return <li data-slot="pagination-item" {...props} />; }
type PaginationLinkProps = { isActive?: boolean } & React.ComponentProps<"a">;
function PaginationLink({ className, isActive, ...props }: PaginationLinkProps) { return <Button variant={isActive ? "outline" : "ghost"} className={cn(className)} nativeButton={false} render={<a aria-current={isActive ? "page" : undefined} data-slot="pagination-link" data-active={isActive} {...props} />} type="button" />; }
export function PaginationPrevious({ className, text = "Previous", ...props }: React.ComponentProps<typeof PaginationLink> & { text?: string }) { return <PaginationLink aria-label="Go to previous page" className={cn("ui-pagination-previous", className)} {...props}><ChevronLeftIcon data-icon="inline-start" /><span className="ui-pagination-label">{text}</span></PaginationLink>; }
export function PaginationNext({ className, text = "Next", ...props }: React.ComponentProps<typeof PaginationLink> & { text?: string }) { return <PaginationLink aria-label="Go to next page" className={cn("ui-pagination-next", className)} {...props}><span className="ui-pagination-label">{text}</span><ChevronRightIcon data-icon="inline-end" /></PaginationLink>; }
export function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) { return <span aria-hidden data-slot="pagination-ellipsis" className={cn("ui-pagination-ellipsis", className)} {...props}><MoreHorizontalIcon /><span className="sr-only">More pages</span></span>; }
function PaginationControls({ count, page, rowsPerPage, onPageChange }: { count: number; page: number; rowsPerPage: number; onPageChange: (page: number) => void }) {
    const pageCount = Math.max(1, Math.ceil(count / rowsPerPage));
    return <div className="ui-pagination-controls" aria-label="Pagination"><span>{count} items</span><Button type="button" variant="outline" size="sm" disabled={page <= 0} onClick={() => onPageChange(page - 1)}>Previous</Button><span aria-current="page">{page + 1} / {pageCount}</span><Button type="button" variant="outline" size="sm" disabled={page + 1 >= pageCount} onClick={() => onPageChange(page + 1)}>Next</Button></div>;
}
export { PaginationControls };
