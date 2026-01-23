import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface GoogleReview {
  id: string;
  reviewer_name: string;
  review_text: string;
  rating: number;
  review_date: string | null;
  is_featured: boolean;
  created_at: string;
}

interface ReviewFormData {
  reviewer_name: string;
  review_text: string;
  rating: number;
  review_date: string;
  is_featured: boolean;
}

const initialFormData: ReviewFormData = {
  reviewer_name: "",
  review_text: "",
  rating: 5,
  review_date: "",
  is_featured: true,
};

export function AdminGoogleReviews() {
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<GoogleReview | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ReviewFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("google_reviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error: any) {
      toast.error("Failed to load reviews");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleOpenDialog = (review?: GoogleReview) => {
    if (review) {
      setEditingReview(review);
      setFormData({
        reviewer_name: review.reviewer_name,
        review_text: review.review_text,
        rating: review.rating,
        review_date: review.review_date || "",
        is_featured: review.is_featured,
      });
    } else {
      setEditingReview(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingReview(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reviewer_name || !formData.review_text) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        reviewer_name: formData.reviewer_name,
        review_text: formData.review_text,
        rating: formData.rating,
        review_date: formData.review_date || null,
        is_featured: formData.is_featured,
      };

      if (editingReview) {
        const { error } = await supabase
          .from("google_reviews")
          .update(payload)
          .eq("id", editingReview.id);

        if (error) throw error;
        toast.success("Review updated successfully");
      } else {
        const { error } = await supabase
          .from("google_reviews")
          .insert(payload);

        if (error) throw error;
        toast.success("Review added successfully");
      }

      handleCloseDialog();
      fetchReviews();
    } catch (error: any) {
      toast.error(error.message || "Failed to save review");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingReviewId) return;

    try {
      const { error } = await supabase
        .from("google_reviews")
        .delete()
        .eq("id", deletingReviewId);

      if (error) throw error;
      toast.success("Review deleted successfully");
      fetchReviews();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete review");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingReviewId(null);
    }
  };

  const handleToggleFeatured = async (review: GoogleReview) => {
    try {
      const { error } = await supabase
        .from("google_reviews")
        .update({ is_featured: !review.is_featured })
        .eq("id", review.id);

      if (error) throw error;
      toast.success(`Review ${!review.is_featured ? "featured" : "unfeatured"}`);
      fetchReviews();
    } catch (error: any) {
      toast.error("Failed to update review");
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`}
      />
    ));
  };

  const StarRatingInput = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            className={`h-6 w-6 ${i < value ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Google Reviews Management
          </CardTitle>
          <CardDescription>
            Manage featured reviews displayed on the dashboard
          </CardDescription>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Review
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No reviews yet. Add your first review to get started.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="max-w-xs">Review</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">{review.reviewer_name}</TableCell>
                    <TableCell>
                      <div className="flex">{renderStars(review.rating)}</div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{review.review_text}</TableCell>
                    <TableCell>
                      {review.review_date ? format(new Date(review.review_date), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={review.is_featured}
                        onCheckedChange={() => handleToggleFeatured(review)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(review)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingReviewId(review.id);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingReview ? "Edit Review" : "Add New Review"}</DialogTitle>
            <DialogDescription>
              {editingReview
                ? "Update the review details below"
                : "Enter the review details to add a new testimonial"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reviewer_name">Reviewer Name *</Label>
              <Input
                id="reviewer_name"
                value={formData.reviewer_name}
                onChange={(e) => setFormData({ ...formData, reviewer_name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="review_text">Review Text *</Label>
              <Textarea
                id="review_text"
                value={formData.review_text}
                onChange={(e) => setFormData({ ...formData, review_text: e.target.value })}
                placeholder="Write the review content..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Rating</Label>
              <StarRatingInput
                value={formData.rating}
                onChange={(rating) => setFormData({ ...formData, rating })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="review_date">Review Date</Label>
              <Input
                id="review_date"
                type="date"
                value={formData.review_date}
                onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
              />
              <Label htmlFor="is_featured">Featured on dashboard</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingReview ? "Update" : "Add Review"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
