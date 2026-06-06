import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav aria-label="pagination" className={cn("mx-auto flex w-full justify-center", className)} {...props} />
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(({ className, ...props }, ref) => (
  <ul className={cn("flex flex-row items-center gap-1", className)} ref={ref} {...props} />
));
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(({ className, ...props }, ref) => (
  <li className={cn("", className)} ref={ref} {...props} />
));
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"button">;

const PaginationLink = ({ className, isActive, size = "icon", ...props }: PaginationLinkProps) => (
  <Button aria-current={isActive ? "page" : undefined} className={cn(className)} size={size} variant={isActive ? "default" : "ghost"} {...props} />
);
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = (props: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to previous page" size="md" {...props}>
    <ChevronLeft className="h-4 w-4" />
    <span>Anterior</span>
  </PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = (props: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to next page" size="md" {...props}>
    <span>Proxima</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span aria-hidden className={cn("flex h-9 w-9 items-center justify-center", className)} {...props}>
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">Mais paginas</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious };
