import { useQuery } from '@tanstack/react-query';
import * as QRCode from 'qrcode';
import { Api, CustomerDetails } from '../api';

export type CustomerDetailQueryData = {
  details: CustomerDetails;
  qrCodeUrl: string;
};

type UseCustomerDetailOptions = {
  id: number | null;
  enabled?: boolean;
};

export function useCustomerDetail({ id, enabled = true }: UseCustomerDetailOptions) {
  return useQuery<CustomerDetailQueryData>({
    queryKey: ['customer-detail', id],
    enabled: enabled && Boolean(id && id > 0),
    queryFn: async () => {
      if (!id || id <= 0) {
        throw new Error('Invalid customer id');
      }

      const details = await Api.customer(id);
      let qrCodeUrl = '';

      if (details.customer.qr_token) {
        qrCodeUrl = await QRCode.toDataURL(details.customer.qr_token, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
      }

      return { details, qrCodeUrl };
    },
  });
}
