import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@shared/ui/dialog';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { ExternalLink, FileText, StickyNote, Plus, Trash2, Star } from 'lucide-react';
import { cn } from '@shared/lib/utils';
import {
  listTaskResources,
  createTaskResource,
  deleteTaskResource,
  setPrimaryResource
} from '@features/tasks/services/taskResourcesService';

const resourceTypeIcons = {
  url: ExternalLink,
  pdf: FileText,
  text: StickyNote
};

const resourceTypeLabels = {
  url: 'External Link',
  pdf: 'Document',
  text: 'Note'
};

export default function TaskResources({ taskId, primaryResourceId, onUpdate }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'url',
    resource_url: '',
    resource_text: '',
    storage_path: ''
  });

  const queryClient = useQueryClient();

  const { data: resources = [] } = useQuery({
    queryKey: ['resources', taskId],
    queryFn: () => listTaskResources(taskId),
    enabled: !!taskId
  });

  const createResourceMutation = useMutation({
    mutationFn: (data) => createTaskResource(taskId, {
      type: data.type,
      url: data.resource_url,
      text_content: data.resource_text,
      storage_path: data.storage_path
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources', taskId] });
      setShowAddModal(false);
      setFormData({ type: 'url', resource_url: '', resource_text: '', storage_path: '' });
      if (onUpdate) onUpdate();
    }
  });

  const deleteResourceMutation = useMutation({
    mutationFn: (id) => deleteTaskResource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources', taskId] });
      if (onUpdate) onUpdate();
    }
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (id) => setPrimaryResource(taskId, id === primaryResourceId ? null : id),
    onSuccess: () => {
      if (onUpdate) onUpdate();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createResourceMutation.mutate(formData);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Resources</h4>
        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="bg-brand-500 hover:bg-brand-600 text-white"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Resource
        </Button>
      </div>

      <div className="space-y-2">
        {resources.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No resources yet</p>
        ) : (
          resources.map((resource) => {
            // Adapted logic: check both 'type' and 'resource_type' to be safe, defaulting to resource_type from service
            const type = resource.resource_type || resource.type;
            const Icon = resourceTypeIcons[type] || FileText;
            const isPrimary = primaryResourceId === resource.id;

            return (
              <div
                key={resource.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all",
                  isPrimary
                    ? "bg-brand-50 border-brand-300"
                    : "bg-white border-slate-200 hover:border-slate-300"
                )}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center",
                    isPrimary ? "bg-brand-500" : "bg-slate-100"
                  )}>
                    <Icon className={cn("w-4 h-4", isPrimary ? "text-white" : "text-slate-600")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {resourceTypeLabels[type] || type}
                    </p>
                    {type === 'url' && resource.resource_url && (
                      <a
                        href={resource.resource_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:underline truncate block"
                      >
                        {resource.resource_url}
                      </a>
                    )}
                    {type === 'text' && resource.resource_text && (
                      <p className="text-xs text-slate-500 truncate">{resource.resource_text.substring(0, 50)}...</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setPrimaryMutation.mutate(resource.id)}
                    className={cn(
                      "h-8 w-8",
                      isPrimary && "text-brand-600 hover:text-brand-700"
                    )}
                  >
                    <Star className={cn("w-4 h-4", isPrimary && "fill-brand-600")} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteResourceMutation.mutate(resource.id)}
                    className="h-8 w-8 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Add Resource</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Resource Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">External Link</SelectItem>
                  <SelectItem value="text">Note</SelectItem>
                  <SelectItem value="pdf">Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === 'url' && (
              <div>
                <Label>URL</Label>
                <Input
                  type="url"
                  value={formData.resource_url}
                  onChange={(e) => setFormData({ ...formData, resource_url: e.target.value })}
                  placeholder="https://example.com"
                  required
                />
              </div>
            )}

            {formData.type === 'text' && (
              <div>
                <Label>Content</Label>
                <Textarea
                  value={formData.resource_text}
                  onChange={(e) => setFormData({ ...formData, resource_text: e.target.value })}
                  placeholder="Enter your note..."
                  rows={4}
                  required
                />
              </div>
            )}

            {formData.type === 'pdf' && (
              <div>
                <Label>Storage Path</Label>
                <Input
                  value={formData.storage_path}
                  onChange={(e) => setFormData({ ...formData, storage_path: e.target.value })}
                  placeholder="path/to/document.pdf"
                  required
                />
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white">
                Add Resource
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
