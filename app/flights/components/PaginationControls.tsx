"use client"

import { Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  canGoPrevious: boolean
  canGoNext: boolean
  goToPage: (page: number) => void
  startIndex: number
  endIndex: number
  totalItems: number
  loading?: boolean
}

export function PaginationControls({
  currentPage,
  totalPages,
  canGoPrevious,
  canGoNext,
  goToPage,
  startIndex,
  endIndex,
  totalItems,
  loading,
}: PaginationControlsProps) {
  if (loading || totalItems === 0) return null

  return (
    <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground text-center sm:text-left">
        Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} flights
      </div>
      <div className="flex items-center justify-center space-x-2">
        {/* Mobile controls */}
        <div className="flex items-center space-x-1 sm:hidden">
          <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={!canGoPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-3 py-1 text-sm font-medium">
            {currentPage} of {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={!canGoNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Desktop controls */}
        <div className="hidden sm:flex items-center space-x-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goToPage(1)} disabled={!canGoPrevious}>
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => goToPage(currentPage - 1)}
            disabled={!canGoPrevious}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                const nearCurrent = Math.abs(page - currentPage) <= 1
                const isFirstPage = page === 1
                const isLastPage = page === totalPages
                return nearCurrent || isFirstPage || isLastPage
              })
              .map((page, index, array) => (
                <Fragment key={page}>
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="text-muted-foreground">...</span>
                  )}
                  <Button
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="icon"
                    className={`h-8 w-8 ${currentPage === page ? 'bg-flight hover:bg-flight/90' : ''}`}
                    onClick={() => goToPage(page)}
                  >
                    <span className="sr-only">Go to page {page}</span>
                    {page}
                  </Button>
                </Fragment>
              ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => goToPage(currentPage + 1)}
            disabled={!canGoNext}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => goToPage(totalPages)}
            disabled={!canGoNext}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
