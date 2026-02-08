export interface Payment {
    id: number,
	membership_id: number,
	amount: number,
	payment_method: string,
	payment_status: string,
	currency: string,
	transaction_id: number,
	refund_amount: number,
	payment_date: string,
	created_date: string,
}