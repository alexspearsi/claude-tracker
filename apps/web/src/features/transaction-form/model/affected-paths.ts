import { ROUTES } from '@/shared/config/routes';

/** Транзакции отображаются на /dashboard (recent-transactions) и /expenses (полный список).
 *  /categories не входит — категория не меняется мутацией транзакции. */
export const TRANSACTION_AFFECTED_PATHS = [ROUTES.dashboard, ROUTES.expenses];
