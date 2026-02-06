import { Toaster as Sonner } from "sonner";

const Toaster = ({
  ...props
}) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-right"
      richColors
      expand={true}
      toastOptions={{
        style: {
          background: 'white',
          color: 'black',
          border: '1px solid #e5e7eb',
          fontSize: '14px',
          fontWeight: '500'
        },
        className: 'toast-item',
      }}
      {...props} />
  );
}

export { Toaster }
