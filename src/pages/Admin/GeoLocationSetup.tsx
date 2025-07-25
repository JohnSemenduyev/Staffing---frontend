import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Circle, Edit, Plus, Trash2 } from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchClient } from "../../hooks/usesearchClient";
import { GeoLocation, useGeoLocation } from "../../context/GeoLocationContext";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";

export const GeoLocationSetup = () => {
  const [form, setForm] = useState({ clientId: "",addressId: "",distance: "",time: "", });
  const [clientSearch, setClientSearch] = useState("");
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const {data: searchedClients = [],isLoading: loadingClients,} = useSearchClient(debouncedClientSearch);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedAddressText, setSelectedAddressText] = useState("");
  const { fetchGeoLocations, createGeoLocation , loading , error , geoLocations , submitLoader , submitError } = useGeoLocation();
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [sortConfig, setSortConfig] = useState<{ key: keyof GeoLocation | null; direction: "asc" | "desc" }>({key: null,direction: "asc",});
  const [searchTerms, setSearchTerms] = useState({clientName: "",clientLocation: "", distance: "", time: "",});
  
  const handleChange = (field: string, value: any) => {
    setForm((f) => ({
      ...f,
      [field]: value,
    }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleClientSelect = (
    client: { id: string | number; name: string },
    addressId: number | string
  ) => {
    setForm((f) => ({
      ...f,
      clientId: String(client.id),
      addressId: String(addressId),
    }));
    setClientSearch(client.name);
    setShowClientDropdown(false);
    setErrors((e) => ({ ...e, clientId: undefined, addressId: undefined }));

    // Find and set the selected address text
    const selectedClient = searchedClients.find((c) => String(c.id) === String(client.id));
    const selectedAddress = selectedClient?.addresses.find((a) => String(a.id) === String(addressId));
    setSelectedAddressText(selectedAddress?.address || "");
  };

  const validate = () => {
    const e: any = {};
    if (!form.clientId) e.clientId = "Required";
    if (!form.addressId) e.addressId = "Required";
    if (!form.distance) e.distance = "Required";
    if (!form.time) e.time = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    createGeoLocation({
      clientId: Number(form.clientId),
      addressId: Number(form.addressId),
      distance: Number(form.distance),
      time: Number(form.time),
    });

    // Reset all form fields including the address text
    setForm({
      clientId: "",
      addressId: "",
      distance: "",
      time: "",
    });
    setClientSearch("");
    setSelectedAddressText("");
  };

  useEffect(() => {
    fetchGeoLocations();
  }, []);

  const fieldInputClasses =
    "w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition";

  const handleSort = (key: keyof GeoLocation) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleEdit = (record: GeoLocation) => {
    console.log(`Start editing assignment for: ${record.id}`);
  };

  const handleDelete = (record: GeoLocation) => {
    console.log(`Delete assignment (id: ${record.id})`);
  };

  const filteredAndSortedData = useMemo(() => {
    let filtered = geoLocations.filter((record) => {
      const clientName = record.client?.name?.toLowerCase() || "";
      const clientLocation = record.address?.address?.toLowerCase() || "";
      const distance = record.distance?.toString() || "";
      const time = record.time?.toString() || "";

      return (
        clientName.includes(searchTerms.clientName.toLowerCase()) &&
        clientLocation.includes(searchTerms.clientLocation.toLowerCase()) &&
        distance.includes(searchTerms.distance) &&
        time.includes(searchTerms.time)
      );
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue: any = "";
        let bValue: any = "";

        switch (sortConfig.key) {
          case "client":
            aValue = a.client?.name || "";
            bValue = b.client?.name || "";
            break;
          case "address":
            aValue = a.address?.address || "";
            bValue = b.address?.address || "";
            break;
          case "distance":
            aValue = Number(a.distance) || 0;
            bValue = Number(b.distance) || 0;
            break;
          case "time":
            aValue = Number(a.time) || 0;
            bValue = Number(b.time) || 0;
            break;
          default:
            return 0;
        }

        if (typeof aValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [geoLocations, searchTerms, sortConfig]);

  
  const tableColumns: TableColumn[] = [
    {
      key: "client.name",
      label: "Client Name",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap"
    },
    {
      key: "address.address",
      label: "Client Location",
      sortable: true,
      searchable: true,
      className: "break-words max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]",
      render: (value: string) => (
        <div className="truncate" title={value}>
          {value || "-"}
        </div>
      )
    },
    {
      key: "distance",
      label: "Distance",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
      render: (value: any) => `${value} Mile`
    },
    {
      key: "time",
      label: "Time",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
      render: (value: any) => `${value} Mins`
    }
  ];

  const tableActions: TableAction[] = [
    {
      label: "Edit",
      icon: <Edit className="w-4 h-4" />,
      onClick: handleEdit,
      className: "text-blue-500 hover:text-green-700",
      title: "Edit"
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-4 h-4" />,
      onClick: handleDelete,
      className: "text-red-500 hover:text-red-700",
      title: "Delete"
    }
  ];


  return (
    <div className="min-h-screen p-6 font-sans">
      <div className="w-full px-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Geolocation Setup
          </h2>
          <form onSubmit={onSubmit} autoComplete="off">
            <div className="grid grid-cols-5 gap-4 items-start">
              <div className="relative">
                <input
                  type="text"
                  value={clientSearch}
                  onFocus={() => setShowClientDropdown(true)}
                  onBlur={() =>
                    setTimeout(() => setShowClientDropdown(false), 200)
                  }
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setForm((f) => ({
                      ...f,
                      clientId: "",
                      addressId: "",
                    }));
                    // Clear the selected address text when user starts typing new client
                    setSelectedAddressText("");
                  }}
                  placeholder="Client Name"
                  className={fieldInputClasses}
                />
                {errors.clientId && (
                  <span className="text-xs text-red-500">{errors.clientId}</span>
                )}
                {errors.addressId && (
                  <span className="text-xs text-red-500 block">
                    {errors.addressId}
                  </span>
                )}
                {showClientDropdown && clientSearch.length >= 2 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto z-50 font-sans">
                    {loadingClients ? (
                      <div className="p-2 text-sm text-gray-500">
                        Searching clients...
                      </div>
                    ) : searchedClients.length === 0 ? (
                      <div className="p-2 text-gray-500 text-sm">
                        No clients found
                      </div>
                    ) : (
                      searchedClients.flatMap((client, clientIndex) =>
                        client.addresses.map((address, addressIndex) => {
                          const isEven = (clientIndex + addressIndex) % 2 === 0;
                          return (
                            <div
                              key={`${client.id}-${address.id}`}
                              onMouseDown={() =>
                                handleClientSelect(
                                  { id: client.id, name: client.name },
                                  address.id
                                )
                              }
                              className={`p-4 cursor-pointer text-sm ${
                                isEven ? "bg-white" : "bg-gray-50"
                              } hover:bg-gray-100`}
                            >
                              <div className="font-semibold text-gray-600 text-base">
                                {client.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {address.label || address.address}
                              </div>
                            </div>
                          );
                        })
                      )
                    )}
                  </div>
                )}
              </div>
              <div>
                <input
                  type="text"
                  value={selectedAddressText}
                  placeholder="Location"
                  readOnly
                  className={`${fieldInputClasses} appearance-none bg-gray-50`}
                />
              </div>
              <div>
                <input
                  type="number"
                  value={form.distance}
                  onChange={(e) => handleChange("distance", e.target.value)}
                  placeholder="Enter distance"
                  min="0"
                  className={`${fieldInputClasses}`}
                />
                {errors.distance && (
                  <span className="text-xs text-red-500">
                    {errors.distance}
                  </span>
                )}
              </div>
              <div>
                <input
                  type="number"
                  value={form.time}
                  onChange={(e) => handleChange("time", e.target.value)}
                  placeholder="Enter time"
                  min="0"
                  className={`${fieldInputClasses} appearance-none`}
                />
                {errors.time && (
                  <span className="text-xs text-red-500">{errors.time}</span>
                )}
              </div>
              <div className="flex justify-start">
                <button
                  type="submit"
                  disabled={submitLoader}
                  className="inline-flex items-center px-6 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap min-w-[160px]"
                >
                  {submitLoader ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add GeoLocation
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

       <GenericTable
          data={geoLocations}
          columns={tableColumns}
          actions={tableActions}
          loading={loading}
          emptyMessage="No records found matching your search criteria."
          searchable={true}
        />
      </div>
    </div>
  );
};