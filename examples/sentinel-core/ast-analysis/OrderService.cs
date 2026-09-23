using System;

namespace Enterprise.Telemetry
{
    public class OrderService
    {
        private readonly string _defaultSchema = "{ \"order\": \"telemetry\" }";

        public bool ProcessOrder(string orderId, int priority)
        {
            // Comment with curly braces { test }
            if (string.IsNullOrEmpty(orderId))
            {
                return false;
            }

            if (priority > 10)
            {
                Console.WriteLine($"Processing high priority order: {orderId}");
                return true;
            }

            return true;
        }
    }
}
