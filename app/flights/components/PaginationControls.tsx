"use client"

import { Fragment } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import s from '@/app/flights/flights.module.css'

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
    <div className={s.pagination}>
      <span className={s.paginationNote}>
        Legs {startIndex + 1}–{Math.min(endIndex, totalItems)} of {totalItems}
      </span>

      <div className={s.pager}>
        {/* Narrow screens: prev / page-of / next */}
        <div className={`${s.pagerMobile} ${s.pager}`}>
          <button
            type="button"
            className={s.pageBtn}
            onClick={() => goToPage(currentPage - 1)}
            disabled={!canGoPrevious}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </button>
          <span className={s.paginationNote}>
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            className={s.pageBtn}
            onClick={() => goToPage(currentPage + 1)}
            disabled={!canGoNext}
            aria-label="Next page"
          >
            <ChevronRight />
          </button>
        </div>

        {/* Wide screens: the full numbered run */}
        <div className={`${s.pagerDesktop} ${s.pager}`}>
          <button
            type="button"
            className={s.pageBtn}
            onClick={() => goToPage(1)}
            disabled={!canGoPrevious}
            aria-label="Go to first page"
          >
            <ChevronsLeft />
          </button>
          <button
            type="button"
            className={s.pageBtn}
            onClick={() => goToPage(currentPage - 1)}
            disabled={!canGoPrevious}
            aria-label="Go to previous page"
          >
            <ChevronLeft />
          </button>

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
                  <span className={s.ellipsis}>···</span>
                )}
                <button
                  type="button"
                  className={`${s.pageBtn} ${currentPage === page ? s.pageBtnActive : ''}`}
                  onClick={() => goToPage(page)}
                  aria-label={`Go to page ${page}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </button>
              </Fragment>
            ))}

          <button
            type="button"
            className={s.pageBtn}
            onClick={() => goToPage(currentPage + 1)}
            disabled={!canGoNext}
            aria-label="Go to next page"
          >
            <ChevronRight />
          </button>
          <button
            type="button"
            className={s.pageBtn}
            onClick={() => goToPage(totalPages)}
            disabled={!canGoNext}
            aria-label="Go to last page"
          >
            <ChevronsRight />
          </button>
        </div>
      </div>
    </div>
  )
}
