import { useTimeSetupContext } from "../../context/TimeStemp";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { useEffect, useState, useRef } from "react";

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
    const [tableHeight, setTableHeight] = useState<string>("400px");
    const formRef = useRef<HTMLDivElement>(null);
    const { timeSetups } = useTimeSetupContext();

    useEffect(() => {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    }, []);

    // Calculate table height dynamically
    useEffect(() => {
      const calculateTableHeight = () => {
        if (formRef.current) {
          const formHeight = formRef.current.offsetHeight;
          const calculatedHeight = `calc(100vh - ${formHeight}px - 150px)`;
          setTableHeight(calculatedHeight);
        }
      };

      // Calculate on mount and when form content changes
      calculateTableHeight();

      // Recalculate on window resize
      const handleResize = () => {
        calculateTableHeight();
      };

      window.addEventListener('resize', handleResize);
      
      // Use ResizeObserver to detect form height changes
      const resizeObserver = new ResizeObserver(() => {
        calculateTableHeight();
      });

      if (formRef.current) {
        resizeObserver.observe(formRef.current);
      }

      return () => {
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
      };
    }, []);
    
    const handleEdit = (record: any) => {
};

const handleDelete = (record: any) => {
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
    render: (value: any) => `${value} Min`
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
    render: (value: any) => `${value} Hr`
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
      <div className="w-10 h-5 bg-gray-300 peer-checked:bg-[#004175] rounded-full relative transition-colors duration-300">
        <div className="w-4 h-4 bg-white rounded-full shadow absolute top-0.5 left-0.5 peer-checked:translate-x-5 transition-transform duration-300" />
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
      <div className="w-10 h-5 bg-gray-300 peer-checked:bg-[#004175] rounded-full relative transition-colors duration-300">
        <div className="w-4 h-4 bg-white rounded-full shadow absolute top-0.5 left-0.5 peer-checked:translate-x-5 transition-transform duration-300" />
      </div>
    </label>
  )
}
];

const tableActions: TableAction[] = [
  {
    label: "Edit",
    icon: <FaRegEdit className="w-4 h-4" color="blue" />,
    onClick: handleEdit,
    className: "text-blue-500 hover:text-green-700",
    title: "Edit"
  },
  {
    label: "Delete",
    icon: <FaRegTrashAlt className="w-4 h-4" />,
    onClick: handleDelete,
    className: "text-red-500 hover:text-red-700",
    title: "Delete"
  }
];


    return (
        <div>
            <div ref={formRef} className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Scheduling & Geolocation</h2>
            </div>
            <GenericTable
              data={timeSetups || []}
              columns={tableColumns}
              actions={tableActions}
              loading={loading}
              emptyMessage="No time setup records found."
              searchable={true}
              tableHeight={tableHeight}
            />
        </div>
    )
}