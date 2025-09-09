// import React from 'react';

// interface PaginationProps {
//   currentPage: number;
//   lastPage: number;
//   onPageChange: (page: number) => void;
// }

// const Pagination: React.FC<PaginationProps> = ({ lastPage, currentPage, onPageChange }) => {
//   const getVisiblePages = (): (number | string)[] => {
//     if (lastPage <= 7) {
//       return Array.from({ length: lastPage }, (_, i) => i + 1);
//     }

//     const pages = [];
    
//     if (currentPage <= 4) {
//       pages.push(1, 2, 3, 4, 5, '...', lastPage);
//     } else if (currentPage >= lastPage - 3) {
//       pages.push(1, '...', lastPage - 4, lastPage - 3, lastPage - 2, lastPage - 1, lastPage);
//     } else {
//       pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', lastPage);
//     }
    
//     return pages;
//   };

//   const visiblePages = getVisiblePages();

//   const handlePageClick = (page: number | string): void => {
//     if (page !== '...' && page !== currentPage) {
//       onPageChange(page as number);
//     }
//   };

//   const handlePrevious = (): void => {
//     if (currentPage > 1) {
//       onPageChange(currentPage - 1);
//     }
//   };

//   const handleNext = (): void => {
//     if (currentPage < lastPage) {
//       onPageChange(currentPage + 1);
//     }
//   };

//   return (
//     <div className="flex items-center justify-center space-x-1 p-4">
//       <button
//         onClick={handlePrevious}
//         disabled={currentPage === 1}
//         className={`flex items-center justify-center w-8 h-8 rounded-full border transition-colors ${
//           currentPage === 1
//             ? 'border-gray-300 text-gray-400 cursor-not-allowed'
//             : 'border-black text-black hover:bg-gray-100'
//         }`}
//       >
//         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
//         </svg>
//       </button>

//       {visiblePages.map((page: number | string, index: number) => {
//         if (page === '...') {
//           return (
//             <span key={`ellipsis-${index}`} className="px-2 text-black">
//               ...
//             </span>
//           );
//         }

//         const isCurrentPage: boolean = page === currentPage;
        
//         return (
//           <button
//             key={page}
//             onClick={() => handlePageClick(page)}
//             className={`flex items-center justify-center w-8 h-8 rounded-full border transition-colors ${
//               isCurrentPage
//                 ? 'bg-blue-900 text-white border-blue-900'
//                 : 'border-black text-black hover:bg-gray-100'
//             }`}
//             style={isCurrentPage ? { backgroundColor: '#004175' } : {}}
//           >
//             {page}
//           </button>
//         );
//       })}

//       <button
//         onClick={handleNext}
//         disabled={currentPage === lastPage}
//         className={`flex items-center justify-center w-8 h-8 rounded-full border transition-colors ${
//           currentPage === lastPage
//             ? 'border-gray-300 text-gray-400 cursor-not-allowed'
//             : 'border-black text-black hover:bg-gray-100'
//         }`}
//       >
//         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//         </svg>
//       </button>
//     </div>
//   );
// };

// export default Pagination;

import React from 'react';

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  onPageChange: (page: number) => void;
  loading?: boolean; // Add loading prop
}

const Pagination: React.FC<PaginationProps> = ({ 
  lastPage, 
  currentPage, 
  onPageChange, 
  loading = false 
}) => {
  const getVisiblePages = (): (number | string)[] => {
    if (lastPage <= 7) {
      return Array.from({ length: lastPage }, (_, i) => i + 1);
    }

    const pages = [];
    
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', lastPage);
    } else if (currentPage >= lastPage - 3) {
      pages.push(1, '...', lastPage - 4, lastPage - 3, lastPage - 2, lastPage - 1, lastPage);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', lastPage);
    }
    
    return pages;
  };

  const visiblePages = getVisiblePages();

  const handlePageClick = (page: number | string): void => {
    if (page !== '...' && page !== currentPage && !loading) {
      onPageChange(page as number);
    }
  };

  const handlePrevious = (): void => {
    if (currentPage > 1 && !loading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = (): void => {
    if (currentPage < lastPage && !loading) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex items-center justify-between p-4">
      {/* Page info on the left */}
      <div className="text-gray-600 text-sm">
        Page {currentPage} of {lastPage}
      </div>

      {/* Pagination controls in the center */}
      <div className="flex items-center space-x-1">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1 || loading}
          className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors ${
            currentPage === 1 || loading
              ? 'border-gray-300 text-gray-400 cursor-not-allowed'
              : 'border-black text-black hover:bg-gray-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {visiblePages.map((page: number | string, index: number) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-black">
                ...
              </span>
            );
          }

          const isCurrentPage: boolean = page === currentPage;
          
          return (
            <button
              key={page}
              onClick={() => handlePageClick(page)}
              disabled={loading}
              className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors ${
                isCurrentPage
                  ? 'bg-blue-900 text-white border-blue-900'
                  : loading
                  ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                  : 'border-black text-black hover:bg-gray-100'
              }`}
              style={isCurrentPage ? { backgroundColor: '#004175' } : {}}
            >
              {loading && isCurrentPage ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                page
              )}
            </button>
          );
        })}

        <button
          onClick={handleNext}
          disabled={currentPage === lastPage || loading}
          className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors ${
            currentPage === lastPage || loading
              ? 'border-gray-300 text-gray-400 cursor-not-allowed'
              : 'border-black text-black hover:bg-gray-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        
      </div>

    </div>
  );
};

export default Pagination;