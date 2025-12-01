import React, {
	useEffect,
	useMemo,
	useState,
	useCallback,
	useRef,
} from "react";
import { ChevronDown } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";
import ResetButton from "./ui/ResetButton";

export interface SearchOption {
	label: string;
	value: any;
	subCategories?: SearchOption[];
}

export interface TableColumn {
	key: string;
	label: string;
	sortable?: boolean;
	searchable?: boolean;
	searchType?: "text" | "dropdown";
	searchPlaceholder?: string;
	searchOptions?: SearchOption[];
	getSearchOptions?: (data: any[]) => SearchOption[];
	render?: (value: any, record: any) => React.ReactNode;
	className?: string;
	headerClassName?: string;
	width?: string;
	searchHeaderClassName?: string;
	height?: string;
}

export interface TableAction {
	label: string;
	icon: React.ReactNode;
	onClick: (record: any) => void;
	className?: string;
	title?: string;
}

interface GenericTableProps {
	data: any[];
	columns: TableColumn[];
	actions?: TableAction[];
	loading?: boolean;
	emptyMessage?: string;
	onSort?: (key: string, direction: "asc" | "desc") => void;
	searchable?: boolean;
	className?: string;
	tableHeight?: string;
	onSearch?: (searchTerms: { [key: string]: string }) => void;
}

export const GenericTable: React.FC<GenericTableProps> = ({
	data,
	columns,
	actions = [],
	loading = false,
	emptyMessage = "No records found matching your search criteria.",
	searchable = true,
	className = "",
	tableHeight = "450px",
	onSearch,
}) => {
	const [sortConfig, setSortConfig] = useState<{
		key: string | null;
		direction: "asc" | "desc";
	}>({
		key: null,
		direction: "asc",
	});
	const notificationDropdownRef = useRef<HTMLDivElement>(null);
	const [searchTerms, setSearchTerms] = useState<{
		[key: string]: string | string[] | any;
		subCategories?: Record<string, string[]>;
	}>({});
	const debouncedSearchTerms = useDebounce(searchTerms, 500);
	const [showNotificationDropdown, setShowNotificationDropdown] =
		useState(false);
	const memoizedOnSearch = useCallback(onSearch, []);
	useEffect(() => {
		if (!showNotificationDropdown) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (
				notificationDropdownRef.current &&
				!notificationDropdownRef.current.contains(event.target as Node)
			) {
				setShowNotificationDropdown(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showNotificationDropdown]);

	const handleSort = (key: string) => {
		setSortConfig((prev) => ({
			key,
			direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
		}));
	};

	const getNestedValue = (obj: any, path: string) => {
		return path.split(".").reduce((current, key) => {
			return current && current[key] !== undefined ? current[key] : null;
		}, obj);
	};

	const getColumnSearchOptions = (column: TableColumn): SearchOption[] => {
		if (column.searchOptions) {
			return column.searchOptions;
		}
		if (column.getSearchOptions) {
			return column.getSearchOptions(data);
		}
		if (column.searchType === "dropdown") {
			const uniqueValues = new Set<string>();

			data.forEach((record) => {
				const value = getNestedValue(record, column.key);
				if (value !== null && value !== undefined) {
					if (Array.isArray(value)) {
						value.forEach((item) => {
							if (item !== null && item !== undefined) {
								uniqueValues.add(String(item));
							}
						});
					} else {
						uniqueValues.add(String(value));
					}
				}
			});
			return Array.from(uniqueValues)
				.sort()
				.map((value) => ({
					label: value,
					value: value,
				}));
		}
		return [];
	};

	useEffect(() => {
		if (memoizedOnSearch) {
			const cleanSearchTerms = Object.fromEntries(
				Object.entries(debouncedSearchTerms).map(([k, v]) => [
					k,
					Array.isArray(v) ? v.join(",") : v,
				])
			);
			memoizedOnSearch(cleanSearchTerms);
		}
	}, [debouncedSearchTerms, memoizedOnSearch]);

	const filteredAndSortedData = useMemo(() => {
		let filtered = data;

		// Local search: filter data if no onSearch prop
		// if (!onSearch) {
		//   Object.entries(searchTerms).forEach(([key, value]) => {
		//     if (!value) return;
		//     filtered = filtered.filter((row) => {
		//       // Support nested keys like "client.name"
		//       const keys = key.split(".");
		//       let cellValue = row;
		//       for (const k of keys) {
		//         cellValue = cellValue?.[k];
		//       }
		//       if (typeof cellValue === "string") {
		//         return cellValue.toLowerCase().includes(value.toLowerCase());
		//       }
		//       if (Array.isArray(cellValue)) {
		//         return cellValue.some((v) =>
		//           String(v).toLowerCase().includes(value.toLowerCase())
		//         );
		//       }
		//       return cellValue !== undefined && cellValue !== null
		//         ? String(cellValue).toLowerCase().includes(value.toLowerCase())
		//         : false;
		//     });
		//   });
		// }

		if (!onSearch) {
			Object.entries(searchTerms).forEach(([key, value]) => {
				if (!value) return;

				const searchValue = String(value).toLowerCase();

				filtered = filtered.filter((row) => {
					// Support nested keys like "client.name"
					const keys = key.split(".");
					let cellValue = row;

					for (const k of keys) {
						cellValue = cellValue?.[k];
					}

					if (typeof cellValue === "string") {
						return cellValue.toLowerCase().includes(searchValue);
					}

					if (Array.isArray(cellValue)) {
						return cellValue.some((v) =>
							String(v).toLowerCase().includes(searchValue)
						);
					}

					return cellValue !== undefined && cellValue !== null
						? String(cellValue).toLowerCase().includes(searchValue)
						: false;
				});
			});
		}

		// Sorting
		if (sortConfig.key) {
			filtered = [...filtered].sort((a, b) => {
				const aValue = getNestedValue(a, sortConfig.key!);
				const bValue = getNestedValue(b, sortConfig.key!);
				if (aValue === null || aValue === undefined) return 1;
				if (bValue === null || bValue === undefined) return -1;
				let aCompare: any = aValue;
				let bCompare: any = bValue;
				if (Array.isArray(aValue))
					aCompare = aValue.length > 0 ? aValue[0] : "";
				if (Array.isArray(bValue))
					bCompare = bValue.length > 0 ? bValue[0] : "";
				if (typeof aCompare === "string" && typeof bCompare === "string") {
					aCompare = aCompare.toLowerCase();
					bCompare = bCompare.toLowerCase();
				} else if (!isNaN(Number(aCompare)) && !isNaN(Number(bCompare))) {
					aCompare = Number(aCompare);
					bCompare = Number(bCompare);
				}

				if (aCompare < bCompare) {
					return sortConfig.direction === "asc" ? -1 : 1;
				}
				if (aCompare > bCompare) {
					return sortConfig.direction === "asc" ? 1 : -1;
				}
				return 0;
			});
		}

		return filtered;
	}, [data, sortConfig, searchTerms, onSearch]);

	const resetSearch = () => {
		setSearchTerms({});
	};
	const hasSearchValues = Object.values(searchTerms).some(
		(val) => val !== undefined && val !== null && String(val)?.trim() !== ""
	);

	const handleCategoryToggle = (
		columnKey: string,
		categoryValue: string,
		subCategories: any[]
	) => {
		setSearchTerms((prev) => {
			const current = (prev[columnKey] as string[]) || [];
			const exists = current.includes(categoryValue);

			if (exists) {
				// Remove category and all its subcategories
				return {
					...prev,
					[columnKey]: current.filter(
						(val) =>
							val !== categoryValue &&
							!subCategories.some((sub) => sub.value === val)
					),
				};
			} else {
				// Add category and subcategories
				return {
					...prev,
					[columnKey]: [
						...current,
						categoryValue,
						...subCategories.map((s) => s.value),
					],
				};
			}
		});
	};

	const handleSubCategoryToggle = (
		columnKey: string,
		subValue: string,
		categoryValue: string,
		subCategories: any[]
	) => {
		setSearchTerms((prev) => {
			const current = (prev[columnKey] as string[]) || [];
			const exists = current.includes(subValue);

			let updatedValues = [...current];
			let updatedSubCats = (prev.subCategories as any) || [];

			if (exists) {
				// 🗑️ Remove the subcategory
				updatedValues = updatedValues.filter((val) => val !== subValue);
				updatedSubCats = updatedSubCats.filter((val) => val !== subValue);

				// If no subcategories remain selected, uncheck parent
				const anySubSelected = subCategories.some((sub) =>
					updatedValues.includes(sub.value)
				);
				if (!anySubSelected) {
					updatedValues = updatedValues.filter((val) => val !== categoryValue);
				}
			} else {
				// ✅ Add the subcategory
				updatedValues.push(subValue);
				updatedSubCats.push(subValue);

				// Automatically check the parent if not already
				if (!updatedValues.includes(categoryValue)) {
					updatedValues.push(categoryValue);
				}
			}

			// remove duplicates for safety
			updatedSubCats = Array.from(new Set(updatedSubCats));

			return {
				...prev,
				[columnKey]: updatedValues,
				subCategories: updatedSubCats,
			};
		});
	};

	const renderSearchField = (column: TableColumn) => {
		if (!column.searchable) return null;
		// update this
		if (
			(column.searchType === "dropdown" && column.key === "notification") ||
			column.key === "notificationType"
		) {
			const options = column.searchOptions || getColumnSearchOptions(column);
			const selectedValues = Array.isArray(searchTerms[column.key])
				? (searchTerms[column.key] as string[])
				: [];

			return (
				<div className='relative' ref={notificationDropdownRef}>
					{/* Dropdown Trigger */}
					<div
						className='w-full px-2 py-1 text-sm border text-gray-400 border-gray-300 rounded-md bg-white flex items-center justify-between cursor-pointer'
						onClick={() =>
							setShowNotificationDropdown(!showNotificationDropdown)
						}
					>
						<div className='flex flex-wrap gap-1 flex-1'>
							{selectedValues.length > 0 ? (
								<span className='text-gray-900'>
									{selectedValues.length} Selected
								</span>
							) : (
								<span className='text-gray-400'>All {column.label}</span>
							)}
						</div>
						<ChevronDown className='w-4 h-4 text-gray-400' />
					</div>

					{/* Dropdown Menu */}
					{showNotificationDropdown && (
						<div className='absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-64 overflow-y-auto z-50'>
							{options.map((cat) => (
								<div key={cat.value} className='border-b p-2'>
									{/* Category */}
									<label className='flex items-center font-medium'>
										<input
											type='checkbox'
											checked={selectedValues.includes(cat.value)}
											onChange={() =>
												handleCategoryToggle(
													column.key,
													cat.value,
													cat.subCategories || []
												)
											}
											className='mr-2 accent-blue-600'
										/>
										{cat.label}
									</label>

									{/* Subcategories */}
									{cat.subCategories?.length > 0 && (
										<div className='ml-6 mt-1 space-y-1'>
											{cat.subCategories.map((sub) => (
												<label
													key={sub.value}
													className='flex items-center text-sm font-normal'
												>
													<input
														type='checkbox'
														checked={selectedValues.includes(sub.value)}
														onChange={() =>
															handleSubCategoryToggle(
																column.key,
																sub.value,
																cat.value,
																cat.subCategories || []
															)
														}
														className='mr-2 accent-blue-600'
													/>
													{sub.label}
												</label>
											))}
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			);
		}

		if (column.searchType === "dropdown") {
			const options = getColumnSearchOptions(column);
			const selectedValue = searchTerms[column.key] || "";
			const [showDropdown, setShowDropdown] = useState(false);
			const dropdownRef = useRef<HTMLDivElement>(null);

			useEffect(() => {
				if (!showDropdown) return;
				const handleClickOutside = (event: MouseEvent) => {
					if (
						dropdownRef.current &&
						!dropdownRef.current.contains(event.target as Node)
					) {
						setShowDropdown(false);
					}
				};
				document.addEventListener("mousedown", handleClickOutside);
				return () => {
					document.removeEventListener("mousedown", handleClickOutside);
				};
			}, [showDropdown]);
			return (
				<div className='relative' ref={dropdownRef}>
					{/* Dropdown trigger */}
					<div
						className='w-full px-2 py-1 text-sm border border-gray-300 rounded-md bg-white flex items-center justify-between cursor-pointer'
						onClick={() => setShowDropdown(!showDropdown)}
					>
						<span className={selectedValue ? "text-gray-900" : "text-gray-400"}>
							{selectedValue
								? options.find((opt) => opt.value === selectedValue)?.label
								: `All ${column.label}`}
						</span>
						<ChevronDown className='w-4 h-4 text-gray-400' />
					</div>

					{/* Dropdown menu */}
					{showDropdown && (
						<div className='absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50'>
							<div
								className='p-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-500'
								onClick={() => {
									setSearchTerms((prev) => ({ ...prev, [column.key]: "" }));
									setShowDropdown(false);
								}}
							>
								All {column.label}
							</div>
							{options.map((opt) => (
								<div
									key={opt.value}
									className='p-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-500'
									onClick={() => {
										setSearchTerms((prev) => ({
											...prev,
											[column.key]: opt.value,
										}));
										setShowDropdown(false);
									}}
								>
									{opt.label}
								</div>
							))}
						</div>
					)}
				</div>
			);
		}

		return (
			<input
				placeholder={
					column.searchPlaceholder || `Search ${column.label.toLowerCase()}`
				}
				className='w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]'
				type='text'
				value={searchTerms[column.key] || ""}
				onChange={(e) =>
					setSearchTerms((prev) => ({
						...prev,
						[column.key]: e.target.value,
					}))
				}
				style={{
					maxWidth: "100%",
					minWidth: column.width ? `calc(${column.width} - 32px)` : "auto",
				}}
			/>
		);
	};

	return (
		<div className={`w-full mt-2 ${className}`}>
			<div className='relative w-full rounded-t-2xl border border-gray-200 shadow-xl overflow-hidden'>
				{loading && (
					<div
						className='absolute bg-white bg-opacity-10 flex items-center justify-center z-30 rounded-2xl'
						style={{
							top: searchable ? "82px" : "41px",
							left: 0,
							right: 0,
							bottom: 0,
						}}
					>
						<div className='flex items-center space-x-2'>
							<div className='w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
							<span className='text-gray-500'>Loading...</span>
						</div>
					</div>
				)}
				<div
					className='overflow-auto bg-white rounded-t-2xl'
					style={{
						maxHeight: tableHeight,
						// Ensure a comfortable viewport for the loader while data is fetching
						minHeight: loading ? "260px" : undefined,
					}}
				>
					<table className='w-auto min-w-full table-fixed text-sm text-gray-800 font-sans'>
						<thead className='bg-[#004175] text-white text-xs font-sans sticky top-0 z-20'>
							<tr className='h-[41px]' style={{ lineHeight: "16px" }}>
								{actions.length > 0 && (
									<th
										className='px-4 py-2 text-left whitespace-nowrap'
										style={{ width: "100px", minWidth: "100px" }}
									>
										<div className='flex items-center h-full'>Actions</div>
									</th>
								)}
								{columns.map((column) => (
									<th
										key={column.key}
										className={`px-4 py-2 text-left whitespace-nowrap ${
											column.headerClassName || ""
										}`}
										style={{
											width: column.width || "auto",
											minWidth: column.width || "auto",
											height: column.height || "auto",
										}}
									>
										<div className='flex items-center'>
											{column.label}
											{column.sortable && (
												<div
													className='pl-1 cursor-pointer'
													onClick={() => handleSort(column.key)}
												>
													<span
														className={`cursor-pointer ${
															sortConfig.key === column.key &&
															sortConfig.direction === "asc"
																? "text-white"
																: "text-white/40"
														}`}
													>
														<svg
															stroke='currentColor'
															fill='currentColor'
															strokeWidth='0'
															viewBox='0 0 512 512'
															className='-mb-1'
															height='1em'
															width='1em'
															xmlns='http://www.w3.org/2000/svg'
														>
															<path d='M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z'></path>
														</svg>
													</span>
													<span
														className={`cursor-pointer ${
															sortConfig.key === column.key &&
															sortConfig.direction === "desc"
																? "text-white"
																: "text-white/40"
														}`}
													>
														<svg
															stroke='currentColor'
															fill='currentColor'
															strokeWidth='0'
															viewBox='0 0 512 512'
															height='1em'
															width='1em'
															xmlns='http://www.w3.org/2000/svg'
														>
															<path d='m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z'></path>
														</svg>
													</span>
												</div>
											)}
										</div>
									</th>
								))}
							</tr>
							{searchable && (
  <tr
    className='bg-white text-gray-700 font-sans w-full h-[41px] sticky top-[41px] z-20'
    style={{ lineHeight: "16px" }}
  >
    {actions.length > 0 && (
      <th className='px-4 py-2 text-left'>
        {hasSearchValues && (
          <ResetButton
            onClick={resetSearch}
            disabled={!hasSearchValues}
          />
        )}
      </th>
    )}
    {columns.map((column) => (
      <th
        key={`search-${column.key}`}
        className={`px-4 py-2 text-left ${column.searchHeaderClassName || ""}`}
        style={{
          width: column.width || "auto",
          minWidth: column.width || "auto",
        }}
      >
        {renderSearchField(column)}
      </th>
    ))}
  </tr>
)}

						</thead>
						<tbody className='relative'>
							{!loading &&
								filteredAndSortedData.map((record, index) => (
									<tr
										key={record.id || index}
										className='group bg-white'
									>
										{actions.length > 0 && (
											<td
												className='px-4 py-3 whitespace-nowrap transition-colors group-hover:bg-blue-50'
												style={{ width: "100px", minWidth: "100px" }}
											>
												<div className='flex items-center gap-2'>
													{actions.map((action, actionIndex) => (
														<button
															key={actionIndex}
															onClick={() => action.onClick(record)}
															className={
																action.className ||
																"text-blue-500 hover:text-blue-700"
															}
															title={action.title || action.label}
														>
															{action.icon}
														</button>
													))}
												</div>
											</td>
										)}
										{columns.map((column) => {
											const value = getNestedValue(record, column.key);
											return (
												<td
													key={column.key}
													className={`px-4 py-3 border-b border-gray-100 whitespace-nowrap transition-colors group-hover:bg-blue-50 ${
														column.className || ""
													}`}
													style={{
														width: column.width || "auto",
														minWidth: column.width || "auto",
													}}
												>
													{column.render
														? column.render(value, record)
														: value || "-"}
												</td>
											);
										})}
									</tr>
								))}

							{!loading && filteredAndSortedData.length === 0 && (
								<tr>
									<td
										colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
										className='relative p-0'
										style={{
											height: `calc(${tableHeight} - ${
												searchable ? "150px" : "100px"
											})`,
										}}
									>
										<div className='absolute inset-0 flex items-center justify-center bg-white'>
											<span className='text-gray-500 text-center'>
												{emptyMessage}
											</span>
										</div>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};
