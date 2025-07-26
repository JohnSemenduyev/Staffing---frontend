import { useTimeSetupContext } from "../../context/TimeStemp";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import { Edit, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { log } from "console";


interface Data {
    id: number;
    distance: number;
    actualScheduledTime: number;
    weeklyHours: number;
    reminderTime: number;
    overlap: boolean;
    unscheduledTime: boolean;
    address: {
      address: string;
    };
    client: {
      name: string;
    };
}


export const SchedulingAndGeolocation = () => {
    const [loading , setLoading] = useState(false);
    const { timeSetups } = useTimeSetupContext();

    useEffect(() => {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
      }, 2000);
      console.log("Time Setups:", timeSetups);
    }, []);
    
    const handleEdit = (record: any) => {
  console.log("Edit record:", record);
};

const handleDelete = (record: any) => {
  console.log("Delete record:", record);
}

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
    label: "Distance (Miles)",
    sortable: true,
    searchable: true,
    className: "whitespace-nowrap",
    render: (value: any) => `${value} Mile`
  },
  {
    key: "actualScheduledTime",
    label: "Scheduled Time",
    sortable: true,
    searchable: true,
    className: "whitespace-nowrap",
    render: (value: any) => `${value} Hr`
  },
  {
    key: "weeklyHours",
    label: "Weekly Hours",
    sortable: true,
    searchable: true,
    className: "whitespace-nowrap",
    render: (value: any) => `${value} Hr`
  },
  {
    key: "reminderTime",
    label: "Reminder Time",
    sortable: true,
    searchable: true,
    className: "whitespace-nowrap",
    render: (value: any) => `${value} Min`
  },
  {
    key: "overlap",
    label: "Overlap",
    sortable: false,
    searchable: false,
    className: "whitespace-nowrap",
    render: (value: boolean) => (
      <label className="inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          readOnly
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 relative transition-colors">
          <div className="w-4 h-4 bg-white rounded-full shadow absolute top-0.5 left-0.5 peer-checked:translate-x-4 transition-transform" />
        </div>
      </label>
    )
  },
  {
    key: "unscheduledTime",
    label: "Unscheduled Time",
    sortable: false,
    searchable: false,
    className: "whitespace-nowrap",
    render: (value: boolean) => (
      <label className="inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          readOnly
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 relative transition-colors">
          <div className="w-4 h-4 bg-white rounded-full shadow absolute top-0.5 left-0.5 peer-checked:translate-x-4 transition-transform" />
        </div>
      </label>
    )
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
        <div>

            <GenericTable
  data={timeSetups || []}
  columns={tableColumns}
  actions={tableActions}
  loading={loading}
  emptyMessage="No time setup records found."
  searchable={true}
/>

        </div>
    )
}