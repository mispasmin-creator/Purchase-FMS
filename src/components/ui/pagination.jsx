import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE_OPTIONS = [100, 500, 1000];

/**
 * Reusable server-side pagination bar.
 * totalRows: total row count from the server (Supabase `count: "exact"`).
 * page: 1-indexed current page.
 */
function PaginationControls({
  page,
  pageSize,
  totalRows,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className,
}) {
  const totalPages = Math.max(1, Math.ceil((totalRows || 0) / pageSize));
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const startRow = totalRows === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
  const endRow = Math.min(clampedPage * pageSize, totalRows || 0);

  const goTo = (nextPage) => {
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    if (clamped !== page) onPageChange(clamped);
  };

  return (
    <div
      data-slot="pagination-controls"
      className={cn(
        "flex flex-col-reverse items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>
          {totalRows === 0
            ? "No rows"
            : `Showing ${startRow.toLocaleString("en-IN")}–${endRow.toLocaleString("en-IN")} of ${totalRows.toLocaleString("en-IN")}`}
        </span>
        <span className="hidden sm:inline">|</span>
        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[80px] text-xs" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={clampedPage <= 1}
          onClick={() => goTo(1)}
          title="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={clampedPage <= 1}
          onClick={() => goTo(clampedPage - 1)}
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[90px] text-center text-xs text-gray-600">
          Page {clampedPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={clampedPage >= totalPages}
          onClick={() => goTo(clampedPage + 1)}
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={clampedPage >= totalPages}
          onClick={() => goTo(totalPages)}
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export { PaginationControls, PAGE_SIZE_OPTIONS };
