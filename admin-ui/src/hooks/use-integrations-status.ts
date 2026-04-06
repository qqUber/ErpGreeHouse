import { useQuery } from '@tanstack/react-query';
import { Api } from '../api';

export type IntegrationsStatusData = {
  telegram: {
    enabled: boolean;
    configured: boolean;
    bot_token_set: boolean;
    config: {
      bot_token?: string;
      enabled?: boolean;
      menu_items?: Array<{
        id: string;
        label: string;
        text?: string;
        media_urls?: string[];
        button_text?: string;
        button_url?: string;
        use_text?: boolean;
        use_media?: boolean;
        use_button?: boolean;
        use_city_list?: boolean;
        use_support_forward?: boolean;
        city_entries?: Array<{
          city: string;
          text?: string;
          media_urls?: string[];
          button_text?: string;
          button_url?: string;
        }>;
      }>;
      support_chat_id?: string;
    };
  };
  vk: {
    enabled: boolean;
    configured: boolean;
    group_id: number | null;
    api_version: string;
  };
};

export function useIntegrationsStatus() {
  return useQuery<IntegrationsStatusData>({
    queryKey: ['integration-settings-status'],
    queryFn: () => Api.getIntegrationsStatus(),
  });
}
